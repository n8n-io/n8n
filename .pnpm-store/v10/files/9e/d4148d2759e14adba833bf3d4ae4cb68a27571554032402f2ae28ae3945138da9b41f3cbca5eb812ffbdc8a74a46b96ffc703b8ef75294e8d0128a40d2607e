"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const buffer_1 = require("buffer");
const ws_1 = __importDefault(require("ws"));
const debug_1 = __importDefault(require("debug"));
const readable_stream_1 = require("readable-stream");
const is_browser_1 = __importDefault(require("../is-browser"));
const BufferedDuplex_1 = require("../BufferedDuplex");
const debug = (0, debug_1.default)('mqttjs:ws');
const WSS_OPTIONS = [
    'rejectUnauthorized',
    'ca',
    'cert',
    'key',
    'pfx',
    'passphrase',
];
function buildUrl(opts, client) {
    let url = `${opts.protocol}://${opts.hostname}:${opts.port}${opts.path}`;
    if (typeof opts.transformWsUrl === 'function') {
        url = opts.transformWsUrl(url, opts, client);
    }
    return url;
}
function setDefaultOpts(opts) {
    const options = opts;
    if (!opts.port) {
        if (opts.protocol === 'wss') {
            options.port = 443;
        }
        else {
            options.port = 80;
        }
    }
    if (!opts.path) {
        options.path = '/';
    }
    if (!opts.wsOptions) {
        options.wsOptions = {};
    }
    if (!is_browser_1.default && opts.protocol === 'wss') {
        WSS_OPTIONS.forEach((prop) => {
            if (Object.prototype.hasOwnProperty.call(opts, prop) &&
                !Object.prototype.hasOwnProperty.call(opts.wsOptions, prop)) {
                options.wsOptions[prop] = opts[prop];
            }
        });
    }
    return options;
}
function setDefaultBrowserOpts(opts) {
    const options = setDefaultOpts(opts);
    if (!options.hostname) {
        options.hostname = options.host;
    }
    if (!options.hostname) {
        if (typeof document === 'undefined') {
            throw new Error('Could not determine host. Specify host manually.');
        }
        const parsed = new URL(document.URL);
        options.hostname = parsed.hostname;
        if (!options.port) {
            options.port = Number(parsed.port);
        }
    }
    if (options.objectMode === undefined) {
        options.objectMode = !(options.binary === true || options.binary === undefined);
    }
    return options;
}
function createWebSocket(client, url, opts) {
    debug('createWebSocket');
    debug(`protocol: ${opts.protocolId} ${opts.protocolVersion}`);
    const websocketSubProtocol = opts.protocolId === 'MQIsdp' && opts.protocolVersion === 3
        ? 'mqttv3.1'
        : 'mqtt';
    debug(`creating new Websocket for url: ${url} and protocol: ${websocketSubProtocol}`);
    let socket;
    if (opts.createWebsocket) {
        socket = opts.createWebsocket(url, [websocketSubProtocol], opts);
    }
    else {
        socket = new ws_1.default(url, [websocketSubProtocol], opts.wsOptions);
    }
    return socket;
}
function createBrowserWebSocket(client, opts) {
    const websocketSubProtocol = opts.protocolId === 'MQIsdp' && opts.protocolVersion === 3
        ? 'mqttv3.1'
        : 'mqtt';
    const url = buildUrl(opts, client);
    let socket;
    if (opts.createWebsocket) {
        socket = opts.createWebsocket(url, [websocketSubProtocol], opts);
    }
    else {
        socket = new WebSocket(url, [websocketSubProtocol]);
    }
    socket.binaryType = 'arraybuffer';
    return socket;
}
const streamBuilder = (client, opts) => {
    debug('streamBuilder');
    const options = setDefaultOpts(opts);
    options.hostname = options.hostname || options.host || 'localhost';
    const url = buildUrl(options, client);
    const socket = createWebSocket(client, url, options);
    const webSocketStream = ws_1.default.createWebSocketStream(socket, options.wsOptions);
    webSocketStream['url'] = url;
    socket.on('close', () => {
        webSocketStream.destroy();
    });
    return webSocketStream;
};
const browserStreamBuilder = (client, opts) => {
    debug('browserStreamBuilder');
    let stream;
    const options = setDefaultBrowserOpts(opts);
    const bufferSize = options.browserBufferSize || 1024 * 512;
    const bufferTimeout = opts.browserBufferTimeout || 1000;
    const coerceToBuffer = !opts.objectMode;
    const socket = createBrowserWebSocket(client, opts);
    const proxy = buildProxy(opts, socketWriteBrowser, socketEndBrowser);
    if (!opts.objectMode) {
        proxy._writev = BufferedDuplex_1.writev.bind(proxy);
    }
    proxy.on('close', () => {
        socket.close();
    });
    const eventListenerSupport = typeof socket.addEventListener !== 'undefined';
    if (socket.readyState === socket.OPEN) {
        stream = proxy;
        stream.socket = socket;
    }
    else {
        stream = new BufferedDuplex_1.BufferedDuplex(opts, proxy, socket);
        if (eventListenerSupport) {
            socket.addEventListener('open', onOpen);
        }
        else {
            socket.onopen = onOpen;
        }
    }
    if (eventListenerSupport) {
        socket.addEventListener('close', onClose);
        socket.addEventListener('error', onError);
        socket.addEventListener('message', onMessage);
    }
    else {
        socket.onclose = onClose;
        socket.onerror = onError;
        socket.onmessage = onMessage;
    }
    function buildProxy(pOptions, socketWrite, socketEnd) {
        const _proxy = new readable_stream_1.Transform({
            objectMode: pOptions.objectMode,
        });
        _proxy._write = socketWrite;
        _proxy._flush = socketEnd;
        return _proxy;
    }
    function onOpen() {
        debug('WebSocket onOpen');
        if (stream instanceof BufferedDuplex_1.BufferedDuplex) {
            stream.socketReady();
        }
    }
    function onClose(event) {
        debug('WebSocket onClose', event);
        stream.end();
        stream.destroy();
    }
    function onError(err) {
        debug('WebSocket onError', err);
        const error = new Error('WebSocket error');
        error['event'] = err;
        stream.destroy(error);
    }
    function onMessage(event) {
        let { data } = event;
        if (data instanceof ArrayBuffer)
            data = buffer_1.Buffer.from(data);
        else
            data = buffer_1.Buffer.from(data, 'utf8');
        proxy.push(data);
    }
    function socketWriteBrowser(chunk, enc, next) {
        if (socket.bufferedAmount > bufferSize) {
            setTimeout(socketWriteBrowser, bufferTimeout, chunk, enc, next);
            return;
        }
        if (coerceToBuffer && typeof chunk === 'string') {
            chunk = buffer_1.Buffer.from(chunk, 'utf8');
        }
        try {
            socket.send(chunk);
        }
        catch (err) {
            return next(err);
        }
        next();
    }
    function socketEndBrowser(done) {
        socket.close();
        done();
    }
    return stream;
};
exports.default = is_browser_1.default ? browserStreamBuilder : streamBuilder;
//# sourceMappingURL=ws.js.map