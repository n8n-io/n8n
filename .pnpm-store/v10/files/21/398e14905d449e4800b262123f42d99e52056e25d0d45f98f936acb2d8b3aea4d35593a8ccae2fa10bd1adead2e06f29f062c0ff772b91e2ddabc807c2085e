"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mimeTypes = void 0;
exports.respondWithGzip = respondWithGzip;
exports.startHttpServer = startHttpServer;
exports.startWsServer = startWsServer;
const http = require("http");
const zlib = require("zlib");
const SocketServer = require('simple-websocket/server.js');
exports.mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
};
// credits: https://stackoverflow.com/a/9238214/1749888
function respondWithGzip(contents, request, response, headers = {}, code = 200) {
    let compressedStream;
    const acceptEncoding = request.headers['accept-encoding'] || '';
    if (acceptEncoding.match(/\bdeflate\b/)) {
        response.writeHead(code, { ...headers, 'content-encoding': 'deflate' });
        compressedStream = zlib.createDeflate();
    }
    else if (acceptEncoding.match(/\bgzip\b/)) {
        response.writeHead(code, { ...headers, 'content-encoding': 'gzip' });
        compressedStream = zlib.createGzip();
    }
    else {
        response.writeHead(code, headers);
        if (typeof contents === 'string' || Buffer.isBuffer(contents)) {
            response.write(contents);
            response.end();
        }
        else if (response !== undefined) {
            contents.pipe(response);
        }
        return;
    }
    if (typeof contents === 'string' || Buffer.isBuffer(contents)) {
        compressedStream.write(contents);
        compressedStream.pipe(response);
        compressedStream.end();
    }
    else {
        contents.pipe(compressedStream).pipe(response);
    }
}
function startHttpServer(port, host, handler) {
    return http.createServer(handler).listen(port, host);
}
function startWsServer(port, host) {
    const socketServer = new SocketServer({ port, host, clientTracking: true });
    socketServer.on('connection', (socket) => {
        socket.on('data', (data) => {
            const message = JSON.parse(data);
            switch (message.type) {
                case 'ping':
                    socket.send('{"type": "pong"}');
                    break;
                default:
                // nope
            }
        });
    });
    socketServer.broadcast = (message) => {
        socketServer._server.clients.forEach((client) => {
            if (client.readyState === 1) {
                // OPEN
                client.send(message);
            }
        });
    };
    return socketServer;
}
