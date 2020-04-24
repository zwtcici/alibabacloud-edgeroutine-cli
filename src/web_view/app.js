const fs = require('fs');
const http = require('http');
const path = require('path');
const chalk = require('chalk');
const Koa = require('Koa');
const cors=require('koa2-cors');
const router = require('koa-router')();
const WebSocket = require('ws');
const popCore = require('@alicloud/pop-core');
const exec = require('child_process').exec;
const views = require('koa-views');
const send = require('koa-send');
const koaStatic = require('koa-static');
const WebSocketApi = require('./utils/ws');//引入封装的ws模块
const app = new Koa();
const server = http.createServer(app.callback());
const wss = new WebSocket.Server({// 同一个端口监听不同的服务
    server
});
WebSocketApi(wss);
app.use(cors({
    exposeHeaders: ['WWW-Authenticate', 'Server-Authorization'],
    maxAge: 5,
    credentials: true,
    allowMethods: ['GET', 'POST', 'DELETE'],
    allowHeaders: ['Content-Type', 'Authorization', 'Accept'],
}));
app.use(views(__dirname + '/views', {map: {html: 'ejs'}}));
app.use(koaStatic(__dirname + '/static'));
router.get('/', async (ctx) => {
    await ctx.render('index');
})
router.get('/readEdgeFile', async (ctx) => {
    let {edgePath=''} =ctx.request.query;
    try{
        let templateStr = fs.readFileSync(edgePath, 'utf8');
        ctx.body = {
            code: 200,
            msg: '查询成功',
            data: templateStr
        }
    }catch (e) {
        // console.error(e);
        ctx.body = {
            code: 412,
            data: '无edge.js文件或路径错误',
            msg: `上传异常${e.message}`
        }
    }
})

router.get('/upload', async (ctx) => {
    try{
        const path=`edge.js`;
        ctx.attachment(path);
        await send(ctx,path);
    }catch (e) {
        console.error(e);
    }
})


app.use(router.routes());
app.use(router.allowedMethods());
const hostName = '127.0.0.1'; //ip
const port = 5888; //端口

const openDefaultBrowser = function (url) {
    switch (process.platform) {
        case "darwin":
            exec('open ' + url);
            break;
        case "win32":
            exec('start ' + url);
            break;
        default:
            exec('xdg-open', [url]);
    }
};
const onError = function (error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    let bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    switch (error.code) {
        case 'EACCES':
            console.error(chalk.red(bind + ' requires elevated privileges'));
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(chalk.red(bind + ' is already in use'));
            process.exit(1);
            break;
        default:
            throw error;
    }
};

module.exports = function () {
    try {
        server.listen(port, hostName, function (err) {
            if (err) {
                console.log(err);
                throw err;
            }
            console.log(`Open the webview http://${hostName}:${port}`);
            openDefaultBrowser(`http://${hostName}:${port}`);
            console.log(chalk.green('Open web debugger success'))
        });
        server.on('error', onError);
    } catch (e) {
        console.log(e)
    }
};