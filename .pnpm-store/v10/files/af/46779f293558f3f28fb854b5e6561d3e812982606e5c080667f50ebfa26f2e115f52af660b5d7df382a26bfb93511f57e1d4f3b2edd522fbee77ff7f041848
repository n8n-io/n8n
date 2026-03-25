"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const buffer_1 = require("buffer");
const readable_stream_1 = require("readable-stream");
const BufferedDuplex_1 = require("../BufferedDuplex");
let socketTask;
let proxy;
let stream;
function buildProxy() {
    const _proxy = new readable_stream_1.Transform();
    _proxy._write = (chunk, encoding, next) => {
        socketTask.send({
            data: chunk.buffer,
            success() {
                next();
            },
            fail(errMsg) {
                next(new Error(errMsg));
            },
        });
    };
    _proxy._flush = (done) => {
        socketTask.close({
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
    const protocol = opts.protocol === 'wxs' ? 'wss' : 'ws';
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
    socketTask.onOpen(() => {
        stream.socketReady();
    });
    socketTask.onMessage((res) => {
        let { data } = res;
        if (data instanceof ArrayBuffer)
            data = buffer_1.Buffer.from(data);
        else
            data = buffer_1.Buffer.from(data, 'utf8');
        proxy.push(data);
    });
    socketTask.onClose(() => {
        stream.emit('close');
        stream.end();
        stream.destroy();
    });
    socketTask.onError((error) => {
        const err = new Error(error.errMsg);
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
    socketTask = wx.connectSocket({
        url,
        protocols: [websocketSubProtocol],
    });
    proxy = buildProxy();
    stream = new BufferedDuplex_1.BufferedDuplex(opts, proxy, socketTask);
    stream._destroy = (err, cb) => {
        socketTask.close({
            success() {
                if (cb)
                    cb(err);
            },
        });
    };
    const destroyRef = stream.destroy;
    stream.destroy = (err, cb) => {
        stream.destroy = destroyRef;
        setTimeout(() => {
            socketTask.close({
                fail() {
                    stream._destroy(err, cb);
                },
            });
        }, 0);
        return stream;
    };
    bindEventHandler();
    return stream;
};
exports.default = buildStream;
//# sourceMappingURL=wx.js.map