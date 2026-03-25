"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const buffer_1 = require("buffer");
const readable_stream_1 = require("readable-stream");
const BufferedDuplex_1 = require("../BufferedDuplex");
let my;
let proxy;
let stream;
let isInitialized = false;
function buildProxy() {
    const _proxy = new readable_stream_1.Transform();
    _proxy._write = (chunk, encoding, next) => {
        my.sendSocketMessage({
            data: chunk.buffer,
            success() {
                next();
            },
            fail() {
                next(new Error());
            },
        });
    };
    _proxy._flush = (done) => {
        my.closeSocket({
            success() {
                done();
            },
        });
    };
    return _proxy;
}
function setDefaultOpts(opts) {
    if (!opts.hostname) {
        opts.hostname = 'localhost';
    }
    if (!opts.path) {
        opts.path = '/';
    }
    if (!opts.wsOptions) {
        opts.wsOptions = {};
    }
}
function buildUrl(opts, client) {
    const protocol = opts.protocol === 'alis' ? 'wss' : 'ws';
    let url = `${protocol}://${opts.hostname}${opts.path}`;
    if (opts.port && opts.port !== 80 && opts.port !== 443) {
        url = `${protocol}://${opts.hostname}:${opts.port}${opts.path}`;
    }
    if (typeof opts.transformWsUrl === 'function') {
        url = opts.transformWsUrl(url, opts, client);
    }
    return url;
}
function bindEventHandler() {
    if (isInitialized)
        return;
    isInitialized = true;
    my.onSocketOpen(() => {
        stream.socketReady();
    });
    my.onSocketMessage((res) => {
        if (typeof res.data === 'string') {
            const buffer = buffer_1.Buffer.from(res.data, 'base64');
            proxy.push(buffer);
        }
        else {
            const reader = new FileReader();
            reader.addEventListener('load', () => {
                let data = reader.result;
                if (data instanceof ArrayBuffer)
                    data = buffer_1.Buffer.from(data);
                else
                    data = buffer_1.Buffer.from(data, 'utf8');
                proxy.push(data);
            });
            reader.readAsArrayBuffer(res.data);
        }
    });
    my.onSocketClose(() => {
        stream.end();
        stream.destroy();
    });
    my.onSocketError((err) => {
        stream.destroy(err);
    });
}
const buildStream = (client, opts) => {
    opts.hostname = opts.hostname || opts.host;
    if (!opts.hostname) {
        throw new Error('Could not determine host. Specify host manually.');
    }
    const websocketSubProtocol = opts.protocolId === 'MQIsdp' && opts.protocolVersion === 3
        ? 'mqttv3.1'
        : 'mqtt';
    setDefaultOpts(opts);
    const url = buildUrl(opts, client);
    my = opts.my;
    my.connectSocket({
        url,
        protocols: websocketSubProtocol,
    });
    proxy = buildProxy();
    stream = new BufferedDuplex_1.BufferedDuplex(opts, proxy, my);
    bindEventHandler();
    return stream;
};
exports.default = buildStream;
//# sourceMappingURL=ali.js.map