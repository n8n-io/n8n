"use strict";
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _RedisSocket_instances, _a, _RedisSocket_initiateOptions, _RedisSocket_isTlsSocket, _RedisSocket_initiator, _RedisSocket_options, _RedisSocket_socket, _RedisSocket_isOpen, _RedisSocket_isReady, _RedisSocket_writableNeedDrain, _RedisSocket_isSocketUnrefed, _RedisSocket_reconnectStrategy, _RedisSocket_shouldReconnect, _RedisSocket_connect, _RedisSocket_createSocket, _RedisSocket_createNetSocket, _RedisSocket_createTlsSocket, _RedisSocket_onSocketError, _RedisSocket_disconnect, _RedisSocket_isCorked;
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
const net = require("net");
const tls = require("tls");
const errors_1 = require("../errors");
const utils_1 = require("../utils");
class RedisSocket extends events_1.EventEmitter {
    get isOpen() {
        return __classPrivateFieldGet(this, _RedisSocket_isOpen, "f");
    }
    get isReady() {
        return __classPrivateFieldGet(this, _RedisSocket_isReady, "f");
    }
    get writableNeedDrain() {
        return __classPrivateFieldGet(this, _RedisSocket_writableNeedDrain, "f");
    }
    constructor(initiator, options) {
        super();
        _RedisSocket_instances.add(this);
        _RedisSocket_initiator.set(this, void 0);
        _RedisSocket_options.set(this, void 0);
        _RedisSocket_socket.set(this, void 0);
        _RedisSocket_isOpen.set(this, false);
        _RedisSocket_isReady.set(this, false);
        // `writable.writableNeedDrain` was added in v15.2.0 and therefore can't be used
        // https://nodejs.org/api/stream.html#stream_writable_writableneeddrain
        _RedisSocket_writableNeedDrain.set(this, false);
        _RedisSocket_isSocketUnrefed.set(this, false);
        _RedisSocket_isCorked.set(this, false);
        __classPrivateFieldSet(this, _RedisSocket_initiator, initiator, "f");
        __classPrivateFieldSet(this, _RedisSocket_options, __classPrivateFieldGet(_a, _a, "m", _RedisSocket_initiateOptions).call(_a, options), "f");
    }
    async connect() {
        if (__classPrivateFieldGet(this, _RedisSocket_isOpen, "f")) {
            throw new Error('Socket already opened');
        }
        __classPrivateFieldSet(this, _RedisSocket_isOpen, true, "f");
        return __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_connect).call(this);
    }
    writeCommand(args) {
        if (!__classPrivateFieldGet(this, _RedisSocket_socket, "f")) {
            throw new errors_1.ClientClosedError();
        }
        for (const toWrite of args) {
            __classPrivateFieldSet(this, _RedisSocket_writableNeedDrain, !__classPrivateFieldGet(this, _RedisSocket_socket, "f").write(toWrite), "f");
        }
    }
    disconnect() {
        if (!__classPrivateFieldGet(this, _RedisSocket_isOpen, "f")) {
            throw new errors_1.ClientClosedError();
        }
        __classPrivateFieldSet(this, _RedisSocket_isOpen, false, "f");
        __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_disconnect).call(this);
    }
    async quit(fn) {
        if (!__classPrivateFieldGet(this, _RedisSocket_isOpen, "f")) {
            throw new errors_1.ClientClosedError();
        }
        __classPrivateFieldSet(this, _RedisSocket_isOpen, false, "f");
        const reply = await fn();
        __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_disconnect).call(this);
        return reply;
    }
    cork() {
        if (!__classPrivateFieldGet(this, _RedisSocket_socket, "f") || __classPrivateFieldGet(this, _RedisSocket_isCorked, "f")) {
            return;
        }
        __classPrivateFieldGet(this, _RedisSocket_socket, "f").cork();
        __classPrivateFieldSet(this, _RedisSocket_isCorked, true, "f");
        setImmediate(() => {
            __classPrivateFieldGet(this, _RedisSocket_socket, "f")?.uncork();
            __classPrivateFieldSet(this, _RedisSocket_isCorked, false, "f");
        });
    }
    ref() {
        __classPrivateFieldSet(this, _RedisSocket_isSocketUnrefed, false, "f");
        __classPrivateFieldGet(this, _RedisSocket_socket, "f")?.ref();
    }
    unref() {
        __classPrivateFieldSet(this, _RedisSocket_isSocketUnrefed, true, "f");
        __classPrivateFieldGet(this, _RedisSocket_socket, "f")?.unref();
    }
}
_a = RedisSocket, _RedisSocket_initiator = new WeakMap(), _RedisSocket_options = new WeakMap(), _RedisSocket_socket = new WeakMap(), _RedisSocket_isOpen = new WeakMap(), _RedisSocket_isReady = new WeakMap(), _RedisSocket_writableNeedDrain = new WeakMap(), _RedisSocket_isSocketUnrefed = new WeakMap(), _RedisSocket_isCorked = new WeakMap(), _RedisSocket_instances = new WeakSet(), _RedisSocket_initiateOptions = function _RedisSocket_initiateOptions(options) {
    var _b, _c;
    options ?? (options = {});
    if (!options.path) {
        (_b = options).port ?? (_b.port = 6379);
        (_c = options).host ?? (_c.host = 'localhost');
    }
    options.connectTimeout ?? (options.connectTimeout = 5000);
    options.keepAlive ?? (options.keepAlive = 5000);
    options.noDelay ?? (options.noDelay = true);
    return options;
}, _RedisSocket_isTlsSocket = function _RedisSocket_isTlsSocket(options) {
    return options.tls === true;
}, _RedisSocket_reconnectStrategy = function _RedisSocket_reconnectStrategy(retries, cause) {
    if (__classPrivateFieldGet(this, _RedisSocket_options, "f").reconnectStrategy === false) {
        return false;
    }
    else if (typeof __classPrivateFieldGet(this, _RedisSocket_options, "f").reconnectStrategy === 'number') {
        return __classPrivateFieldGet(this, _RedisSocket_options, "f").reconnectStrategy;
    }
    else if (__classPrivateFieldGet(this, _RedisSocket_options, "f").reconnectStrategy) {
        try {
            const retryIn = __classPrivateFieldGet(this, _RedisSocket_options, "f").reconnectStrategy(retries, cause);
            if (retryIn !== false && !(retryIn instanceof Error) && typeof retryIn !== 'number') {
                throw new TypeError(`Reconnect strategy should return \`false | Error | number\`, got ${retryIn} instead`);
            }
            return retryIn;
        }
        catch (err) {
            this.emit('error', err);
        }
    }
    return Math.min(retries * 50, 500);
}, _RedisSocket_shouldReconnect = function _RedisSocket_shouldReconnect(retries, cause) {
    const retryIn = __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_reconnectStrategy).call(this, retries, cause);
    if (retryIn === false) {
        __classPrivateFieldSet(this, _RedisSocket_isOpen, false, "f");
        this.emit('error', cause);
        return cause;
    }
    else if (retryIn instanceof Error) {
        __classPrivateFieldSet(this, _RedisSocket_isOpen, false, "f");
        this.emit('error', cause);
        return new errors_1.ReconnectStrategyError(retryIn, cause);
    }
    return retryIn;
}, _RedisSocket_connect = async function _RedisSocket_connect() {
    let retries = 0;
    do {
        try {
            __classPrivateFieldSet(this, _RedisSocket_socket, await __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_createSocket).call(this), "f");
            __classPrivateFieldSet(this, _RedisSocket_writableNeedDrain, false, "f");
            this.emit('connect');
            try {
                await __classPrivateFieldGet(this, _RedisSocket_initiator, "f").call(this);
            }
            catch (err) {
                __classPrivateFieldGet(this, _RedisSocket_socket, "f").destroy();
                __classPrivateFieldSet(this, _RedisSocket_socket, undefined, "f");
                throw err;
            }
            __classPrivateFieldSet(this, _RedisSocket_isReady, true, "f");
            this.emit('ready');
        }
        catch (err) {
            const retryIn = __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_shouldReconnect).call(this, retries++, err);
            if (typeof retryIn !== 'number') {
                throw retryIn;
            }
            this.emit('error', err);
            await (0, utils_1.promiseTimeout)(retryIn);
            this.emit('reconnecting');
        }
    } while (__classPrivateFieldGet(this, _RedisSocket_isOpen, "f") && !__classPrivateFieldGet(this, _RedisSocket_isReady, "f"));
}, _RedisSocket_createSocket = function _RedisSocket_createSocket() {
    return new Promise((resolve, reject) => {
        const { connectEvent, socket } = __classPrivateFieldGet(_a, _a, "m", _RedisSocket_isTlsSocket).call(_a, __classPrivateFieldGet(this, _RedisSocket_options, "f")) ?
            __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_createTlsSocket).call(this) :
            __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_createNetSocket).call(this);
        if (__classPrivateFieldGet(this, _RedisSocket_options, "f").connectTimeout) {
            socket.setTimeout(__classPrivateFieldGet(this, _RedisSocket_options, "f").connectTimeout, () => socket.destroy(new errors_1.ConnectionTimeoutError()));
        }
        if (__classPrivateFieldGet(this, _RedisSocket_isSocketUnrefed, "f")) {
            socket.unref();
        }
        socket
            .setNoDelay(__classPrivateFieldGet(this, _RedisSocket_options, "f").noDelay)
            .once('error', reject)
            .once(connectEvent, () => {
            socket
                .setTimeout(0)
                // https://github.com/nodejs/node/issues/31663
                .setKeepAlive(__classPrivateFieldGet(this, _RedisSocket_options, "f").keepAlive !== false, __classPrivateFieldGet(this, _RedisSocket_options, "f").keepAlive || 0)
                .off('error', reject)
                .once('error', (err) => __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_onSocketError).call(this, err))
                .once('close', hadError => {
                if (!hadError && __classPrivateFieldGet(this, _RedisSocket_isOpen, "f") && __classPrivateFieldGet(this, _RedisSocket_socket, "f") === socket) {
                    __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_onSocketError).call(this, new errors_1.SocketClosedUnexpectedlyError());
                }
            })
                .on('drain', () => {
                __classPrivateFieldSet(this, _RedisSocket_writableNeedDrain, false, "f");
                this.emit('drain');
            })
                .on('data', data => this.emit('data', data));
            resolve(socket);
        });
    });
}, _RedisSocket_createNetSocket = function _RedisSocket_createNetSocket() {
    return {
        connectEvent: 'connect',
        socket: net.connect(__classPrivateFieldGet(this, _RedisSocket_options, "f")) // TODO
    };
}, _RedisSocket_createTlsSocket = function _RedisSocket_createTlsSocket() {
    return {
        connectEvent: 'secureConnect',
        socket: tls.connect(__classPrivateFieldGet(this, _RedisSocket_options, "f")) // TODO
    };
}, _RedisSocket_onSocketError = function _RedisSocket_onSocketError(err) {
    const wasReady = __classPrivateFieldGet(this, _RedisSocket_isReady, "f");
    __classPrivateFieldSet(this, _RedisSocket_isReady, false, "f");
    this.emit('error', err);
    if (!wasReady || !__classPrivateFieldGet(this, _RedisSocket_isOpen, "f") || typeof __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_shouldReconnect).call(this, 0, err) !== 'number')
        return;
    this.emit('reconnecting');
    __classPrivateFieldGet(this, _RedisSocket_instances, "m", _RedisSocket_connect).call(this).catch(() => {
        // the error was already emitted, silently ignore it
    });
}, _RedisSocket_disconnect = function _RedisSocket_disconnect() {
    __classPrivateFieldSet(this, _RedisSocket_isReady, false, "f");
    if (__classPrivateFieldGet(this, _RedisSocket_socket, "f")) {
        __classPrivateFieldGet(this, _RedisSocket_socket, "f").destroy();
        __classPrivateFieldSet(this, _RedisSocket_socket, undefined, "f");
    }
    this.emit('end');
};
exports.default = RedisSocket;
