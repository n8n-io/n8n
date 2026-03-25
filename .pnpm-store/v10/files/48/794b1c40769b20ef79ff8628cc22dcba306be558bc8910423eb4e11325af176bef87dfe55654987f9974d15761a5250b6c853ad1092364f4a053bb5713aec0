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
var _RedisClient_instances, _a, _RedisClient_options, _RedisClient_socket, _RedisClient_queue, _RedisClient_isolationPool, _RedisClient_v4, _RedisClient_selectedDB, _RedisClient_initiateOptions, _RedisClient_initiateQueue, _RedisClient_initiateSocket, _RedisClient_initiateIsolationPool, _RedisClient_legacyMode, _RedisClient_legacySendCommand, _RedisClient_defineLegacyCommand, _RedisClient_pingTimer, _RedisClient_setPingTimer, _RedisClient_sendCommand, _RedisClient_pubSubCommand, _RedisClient_tick, _RedisClient_addMultiCommands, _RedisClient_destroyIsolationPool;
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("./commands");
const socket_1 = require("./socket");
const commands_queue_1 = require("./commands-queue");
const multi_command_1 = require("./multi-command");
const events_1 = require("events");
const command_options_1 = require("../command-options");
const commander_1 = require("../commander");
const generic_pool_1 = require("generic-pool");
const errors_1 = require("../errors");
const url_1 = require("url");
const pub_sub_1 = require("./pub-sub");
const package_json_1 = require("../../package.json");
class RedisClient extends events_1.EventEmitter {
    static commandOptions(options) {
        return (0, command_options_1.commandOptions)(options);
    }
    static extend(extensions) {
        const Client = (0, commander_1.attachExtensions)({
            BaseClass: _a,
            modulesExecutor: _a.prototype.commandsExecutor,
            modules: extensions?.modules,
            functionsExecutor: _a.prototype.functionsExecuter,
            functions: extensions?.functions,
            scriptsExecutor: _a.prototype.scriptsExecuter,
            scripts: extensions?.scripts
        });
        if (Client !== _a) {
            Client.prototype.Multi = multi_command_1.default.extend(extensions);
        }
        return Client;
    }
    static create(options) {
        return new (_a.extend(options))(options);
    }
    static parseURL(url) {
        // https://www.iana.org/assignments/uri-schemes/prov/redis
        const { hostname, port, protocol, username, password, pathname } = new url_1.URL(url), parsed = {
            socket: {
                host: hostname
            }
        };
        if (protocol === 'rediss:') {
            parsed.socket.tls = true;
        }
        else if (protocol !== 'redis:') {
            throw new TypeError('Invalid protocol');
        }
        if (port) {
            parsed.socket.port = Number(port);
        }
        if (username) {
            parsed.username = decodeURIComponent(username);
        }
        if (password) {
            parsed.password = decodeURIComponent(password);
        }
        if (pathname.length > 1) {
            const database = Number(pathname.substring(1));
            if (isNaN(database)) {
                throw new TypeError('Invalid pathname');
            }
            parsed.database = database;
        }
        return parsed;
    }
    get options() {
        return __classPrivateFieldGet(this, _RedisClient_options, "f");
    }
    get isOpen() {
        return __classPrivateFieldGet(this, _RedisClient_socket, "f").isOpen;
    }
    get isReady() {
        return __classPrivateFieldGet(this, _RedisClient_socket, "f").isReady;
    }
    get isPubSubActive() {
        return __classPrivateFieldGet(this, _RedisClient_queue, "f").isPubSubActive;
    }
    get v4() {
        if (!__classPrivateFieldGet(this, _RedisClient_options, "f")?.legacyMode) {
            throw new Error('the client is not in "legacy mode"');
        }
        return __classPrivateFieldGet(this, _RedisClient_v4, "f");
    }
    constructor(options) {
        super();
        _RedisClient_instances.add(this);
        Object.defineProperty(this, "commandOptions", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: _a.commandOptions
        });
        _RedisClient_options.set(this, void 0);
        _RedisClient_socket.set(this, void 0);
        _RedisClient_queue.set(this, void 0);
        _RedisClient_isolationPool.set(this, void 0);
        _RedisClient_v4.set(this, {});
        _RedisClient_selectedDB.set(this, 0);
        _RedisClient_pingTimer.set(this, void 0);
        Object.defineProperty(this, "select", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.SELECT
        });
        Object.defineProperty(this, "subscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.SUBSCRIBE
        });
        Object.defineProperty(this, "unsubscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.UNSUBSCRIBE
        });
        Object.defineProperty(this, "pSubscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.PSUBSCRIBE
        });
        Object.defineProperty(this, "pUnsubscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.PUNSUBSCRIBE
        });
        Object.defineProperty(this, "sSubscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.SSUBSCRIBE
        });
        Object.defineProperty(this, "sUnsubscribe", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.SUNSUBSCRIBE
        });
        Object.defineProperty(this, "quit", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.QUIT
        });
        Object.defineProperty(this, "multi", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: this.MULTI
        });
        __classPrivateFieldSet(this, _RedisClient_options, __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_initiateOptions).call(this, options), "f");
        __classPrivateFieldSet(this, _RedisClient_queue, __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_initiateQueue).call(this), "f");
        __classPrivateFieldSet(this, _RedisClient_socket, __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_initiateSocket).call(this), "f");
        // should be initiated in connect, not here
        // TODO: consider breaking in v5
        __classPrivateFieldSet(this, _RedisClient_isolationPool, __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_initiateIsolationPool).call(this), "f");
        __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_legacyMode).call(this);
    }
    duplicate(overrides) {
        return new (Object.getPrototypeOf(this).constructor)({
            ...__classPrivateFieldGet(this, _RedisClient_options, "f"),
            ...overrides
        });
    }
    async connect() {
        // see comment in constructor
        __classPrivateFieldSet(this, _RedisClient_isolationPool, __classPrivateFieldGet(this, _RedisClient_isolationPool, "f") ?? __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_initiateIsolationPool).call(this), "f");
        await __classPrivateFieldGet(this, _RedisClient_socket, "f").connect();
        return this;
    }
    async commandsExecutor(command, args) {
        const { args: redisArgs, options } = (0, commander_1.transformCommandArguments)(command, args);
        return (0, commander_1.transformCommandReply)(command, await __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, redisArgs, options), redisArgs.preserve);
    }
    sendCommand(args, options) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, args, options);
    }
    async functionsExecuter(fn, args, name) {
        const { args: redisArgs, options } = (0, commander_1.transformCommandArguments)(fn, args);
        return (0, commander_1.transformCommandReply)(fn, await this.executeFunction(name, fn, redisArgs, options), redisArgs.preserve);
    }
    executeFunction(name, fn, args, options) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, (0, commander_1.fCallArguments)(name, fn, args), options);
    }
    async scriptsExecuter(script, args) {
        const { args: redisArgs, options } = (0, commander_1.transformCommandArguments)(script, args);
        return (0, commander_1.transformCommandReply)(script, await this.executeScript(script, redisArgs, options), redisArgs.preserve);
    }
    async executeScript(script, args, options) {
        const redisArgs = ['EVALSHA', script.SHA1];
        if (script.NUMBER_OF_KEYS !== undefined) {
            redisArgs.push(script.NUMBER_OF_KEYS.toString());
        }
        redisArgs.push(...args);
        try {
            return await __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, redisArgs, options);
        }
        catch (err) {
            if (!err?.message?.startsWith?.('NOSCRIPT')) {
                throw err;
            }
            redisArgs[0] = 'EVAL';
            redisArgs[1] = script.SCRIPT;
            return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, redisArgs, options);
        }
    }
    async SELECT(options, db) {
        if (!(0, command_options_1.isCommandOptions)(options)) {
            db = options;
            options = null;
        }
        await __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, ['SELECT', db.toString()], options);
        __classPrivateFieldSet(this, _RedisClient_selectedDB, db, "f");
    }
    SUBSCRIBE(channels, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").subscribe(pub_sub_1.PubSubType.CHANNELS, channels, listener, bufferMode));
    }
    UNSUBSCRIBE(channels, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").unsubscribe(pub_sub_1.PubSubType.CHANNELS, channels, listener, bufferMode));
    }
    PSUBSCRIBE(patterns, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").subscribe(pub_sub_1.PubSubType.PATTERNS, patterns, listener, bufferMode));
    }
    PUNSUBSCRIBE(patterns, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").unsubscribe(pub_sub_1.PubSubType.PATTERNS, patterns, listener, bufferMode));
    }
    SSUBSCRIBE(channels, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").subscribe(pub_sub_1.PubSubType.SHARDED, channels, listener, bufferMode));
    }
    SUNSUBSCRIBE(channels, listener, bufferMode) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").unsubscribe(pub_sub_1.PubSubType.SHARDED, channels, listener, bufferMode));
    }
    getPubSubListeners(type) {
        return __classPrivateFieldGet(this, _RedisClient_queue, "f").getPubSubListeners(type);
    }
    extendPubSubChannelListeners(type, channel, listeners) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").extendPubSubChannelListeners(type, channel, listeners));
    }
    extendPubSubListeners(type, listeners) {
        return __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_pubSubCommand).call(this, __classPrivateFieldGet(this, _RedisClient_queue, "f").extendPubSubListeners(type, listeners));
    }
    QUIT() {
        return __classPrivateFieldGet(this, _RedisClient_socket, "f").quit(async () => {
            if (__classPrivateFieldGet(this, _RedisClient_pingTimer, "f"))
                clearTimeout(__classPrivateFieldGet(this, _RedisClient_pingTimer, "f"));
            const quitPromise = __classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(['QUIT']);
            __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this);
            const [reply] = await Promise.all([
                quitPromise,
                __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_destroyIsolationPool).call(this)
            ]);
            return reply;
        });
    }
    executeIsolated(fn) {
        if (!__classPrivateFieldGet(this, _RedisClient_isolationPool, "f"))
            return Promise.reject(new errors_1.ClientClosedError());
        return __classPrivateFieldGet(this, _RedisClient_isolationPool, "f").use(fn);
    }
    MULTI() {
        return new this.Multi(this.multiExecutor.bind(this), __classPrivateFieldGet(this, _RedisClient_options, "f")?.legacyMode);
    }
    async multiExecutor(commands, selectedDB, chainId) {
        if (!__classPrivateFieldGet(this, _RedisClient_socket, "f").isOpen) {
            return Promise.reject(new errors_1.ClientClosedError());
        }
        const promise = chainId ?
            // if `chainId` has a value, it's a `MULTI` (and not "pipeline") - need to add the `MULTI` and `EXEC` commands
            Promise.all([
                __classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(['MULTI'], { chainId }),
                __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_addMultiCommands).call(this, commands, chainId),
                __classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(['EXEC'], { chainId })
            ]) :
            __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_addMultiCommands).call(this, commands);
        __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this);
        const results = await promise;
        if (selectedDB !== undefined) {
            __classPrivateFieldSet(this, _RedisClient_selectedDB, selectedDB, "f");
        }
        return results;
    }
    async *scanIterator(options) {
        let cursor = 0;
        do {
            const reply = await this.scan(cursor, options);
            cursor = reply.cursor;
            for (const key of reply.keys) {
                yield key;
            }
        } while (cursor !== 0);
    }
    async *hScanIterator(key, options) {
        let cursor = 0;
        do {
            const reply = await this.hScan(key, cursor, options);
            cursor = reply.cursor;
            for (const tuple of reply.tuples) {
                yield tuple;
            }
        } while (cursor !== 0);
    }
    async *sScanIterator(key, options) {
        let cursor = 0;
        do {
            const reply = await this.sScan(key, cursor, options);
            cursor = reply.cursor;
            for (const member of reply.members) {
                yield member;
            }
        } while (cursor !== 0);
    }
    async *zScanIterator(key, options) {
        let cursor = 0;
        do {
            const reply = await this.zScan(key, cursor, options);
            cursor = reply.cursor;
            for (const member of reply.members) {
                yield member;
            }
        } while (cursor !== 0);
    }
    async disconnect() {
        if (__classPrivateFieldGet(this, _RedisClient_pingTimer, "f"))
            clearTimeout(__classPrivateFieldGet(this, _RedisClient_pingTimer, "f"));
        __classPrivateFieldGet(this, _RedisClient_queue, "f").flushAll(new errors_1.DisconnectsClientError());
        __classPrivateFieldGet(this, _RedisClient_socket, "f").disconnect();
        await __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_destroyIsolationPool).call(this);
    }
    ref() {
        __classPrivateFieldGet(this, _RedisClient_socket, "f").ref();
    }
    unref() {
        __classPrivateFieldGet(this, _RedisClient_socket, "f").unref();
    }
}
_a = RedisClient, _RedisClient_options = new WeakMap(), _RedisClient_socket = new WeakMap(), _RedisClient_queue = new WeakMap(), _RedisClient_isolationPool = new WeakMap(), _RedisClient_v4 = new WeakMap(), _RedisClient_selectedDB = new WeakMap(), _RedisClient_pingTimer = new WeakMap(), _RedisClient_instances = new WeakSet(), _RedisClient_initiateOptions = function _RedisClient_initiateOptions(options) {
    if (options?.url) {
        const parsed = _a.parseURL(options.url);
        if (options.socket) {
            parsed.socket = Object.assign(options.socket, parsed.socket);
        }
        Object.assign(options, parsed);
    }
    if (options?.database) {
        __classPrivateFieldSet(this, _RedisClient_selectedDB, options.database, "f");
    }
    return options;
}, _RedisClient_initiateQueue = function _RedisClient_initiateQueue() {
    return new commands_queue_1.default(__classPrivateFieldGet(this, _RedisClient_options, "f")?.commandsQueueMaxLength, (channel, listeners) => this.emit('sharded-channel-moved', channel, listeners));
}, _RedisClient_initiateSocket = function _RedisClient_initiateSocket() {
    const socketInitiator = async () => {
        const promises = [];
        if (__classPrivateFieldGet(this, _RedisClient_selectedDB, "f") !== 0) {
            promises.push(__classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(['SELECT', __classPrivateFieldGet(this, _RedisClient_selectedDB, "f").toString()], { asap: true }));
        }
        if (__classPrivateFieldGet(this, _RedisClient_options, "f")?.readonly) {
            promises.push(__classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(commands_1.default.READONLY.transformArguments(), { asap: true }));
        }
        if (!__classPrivateFieldGet(this, _RedisClient_options, "f")?.disableClientInfo) {
            promises.push(__classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(['CLIENT', 'SETINFO', 'LIB-VER', package_json_1.version], { asap: true }).catch(err => {
                if (!(err instanceof errors_1.ErrorReply)) {
                    throw err;
                }
            }));
            promises.push(__classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand([
                'CLIENT', 'SETINFO', 'LIB-NAME',
                __classPrivateFieldGet(this, _RedisClient_options, "f")?.clientInfoTag ? `node-redis(${__classPrivateFieldGet(this, _RedisClient_options, "f").clientInfoTag})` : 'node-redis'
            ], { asap: true }).catch(err => {
                if (!(err instanceof errors_1.ErrorReply)) {
                    throw err;
                }
            }));
        }
        if (__classPrivateFieldGet(this, _RedisClient_options, "f")?.name) {
            promises.push(__classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(commands_1.default.CLIENT_SETNAME.transformArguments(__classPrivateFieldGet(this, _RedisClient_options, "f").name), { asap: true }));
        }
        if (__classPrivateFieldGet(this, _RedisClient_options, "f")?.username || __classPrivateFieldGet(this, _RedisClient_options, "f")?.password) {
            promises.push(__classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(commands_1.default.AUTH.transformArguments({
                username: __classPrivateFieldGet(this, _RedisClient_options, "f").username,
                password: __classPrivateFieldGet(this, _RedisClient_options, "f").password ?? ''
            }), { asap: true }));
        }
        const resubscribePromise = __classPrivateFieldGet(this, _RedisClient_queue, "f").resubscribe();
        if (resubscribePromise) {
            promises.push(resubscribePromise);
        }
        if (promises.length) {
            __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this, true);
            await Promise.all(promises);
        }
    };
    return new socket_1.default(socketInitiator, __classPrivateFieldGet(this, _RedisClient_options, "f")?.socket)
        .on('data', chunk => __classPrivateFieldGet(this, _RedisClient_queue, "f").onReplyChunk(chunk))
        .on('error', err => {
        this.emit('error', err);
        if (__classPrivateFieldGet(this, _RedisClient_socket, "f").isOpen && !__classPrivateFieldGet(this, _RedisClient_options, "f")?.disableOfflineQueue) {
            __classPrivateFieldGet(this, _RedisClient_queue, "f").flushWaitingForReply(err);
        }
        else {
            __classPrivateFieldGet(this, _RedisClient_queue, "f").flushAll(err);
        }
    })
        .on('connect', () => {
        this.emit('connect');
    })
        .on('ready', () => {
        this.emit('ready');
        __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_setPingTimer).call(this);
        __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this);
    })
        .on('reconnecting', () => this.emit('reconnecting'))
        .on('drain', () => __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this))
        .on('end', () => this.emit('end'));
}, _RedisClient_initiateIsolationPool = function _RedisClient_initiateIsolationPool() {
    return (0, generic_pool_1.createPool)({
        create: async () => {
            const duplicate = this.duplicate({
                isolationPoolOptions: undefined
            }).on('error', err => this.emit('error', err));
            await duplicate.connect();
            return duplicate;
        },
        destroy: client => client.disconnect()
    }, __classPrivateFieldGet(this, _RedisClient_options, "f")?.isolationPoolOptions);
}, _RedisClient_legacyMode = function _RedisClient_legacyMode() {
    var _b, _c;
    if (!__classPrivateFieldGet(this, _RedisClient_options, "f")?.legacyMode)
        return;
    __classPrivateFieldGet(this, _RedisClient_v4, "f").sendCommand = __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).bind(this);
    this.sendCommand = (...args) => {
        const result = __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_legacySendCommand).call(this, ...args);
        if (result) {
            result.promise
                .then(reply => result.callback(null, reply))
                .catch(err => result.callback(err));
        }
    };
    for (const [name, command] of Object.entries(commands_1.default)) {
        __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, name, command);
        (_b = this)[_c = name.toLowerCase()] ?? (_b[_c] = this[name]);
    }
    // hard coded commands
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, 'SELECT');
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, 'select');
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, 'SUBSCRIBE');
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, 'subscribe');
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, 'PSUBSCRIBE');
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, 'pSubscribe');
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, 'UNSUBSCRIBE');
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, 'unsubscribe');
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, 'PUNSUBSCRIBE');
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, 'pUnsubscribe');
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, 'QUIT');
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_defineLegacyCommand).call(this, 'quit');
}, _RedisClient_legacySendCommand = function _RedisClient_legacySendCommand(...args) {
    const callback = typeof args[args.length - 1] === 'function' ?
        args.pop() :
        undefined;
    const promise = __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, (0, commander_1.transformLegacyCommandArguments)(args));
    if (callback)
        return {
            promise,
            callback
        };
    promise.catch(err => this.emit('error', err));
}, _RedisClient_defineLegacyCommand = function _RedisClient_defineLegacyCommand(name, command) {
    __classPrivateFieldGet(this, _RedisClient_v4, "f")[name] = this[name].bind(this);
    this[name] = command && command.TRANSFORM_LEGACY_REPLY && command.transformReply ?
        (...args) => {
            const result = __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_legacySendCommand).call(this, name, ...args);
            if (result) {
                result.promise
                    .then(reply => result.callback(null, command.transformReply(reply)))
                    .catch(err => result.callback(err));
            }
        } :
        (...args) => this.sendCommand(name, ...args);
}, _RedisClient_setPingTimer = function _RedisClient_setPingTimer() {
    if (!__classPrivateFieldGet(this, _RedisClient_options, "f")?.pingInterval || !__classPrivateFieldGet(this, _RedisClient_socket, "f").isReady)
        return;
    clearTimeout(__classPrivateFieldGet(this, _RedisClient_pingTimer, "f"));
    __classPrivateFieldSet(this, _RedisClient_pingTimer, setTimeout(() => {
        if (!__classPrivateFieldGet(this, _RedisClient_socket, "f").isReady)
            return;
        // using #sendCommand to support legacy mode
        __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_sendCommand).call(this, ['PING'])
            .then(reply => this.emit('ping-interval', reply))
            .catch(err => this.emit('error', err))
            .finally(() => __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_setPingTimer).call(this));
    }, __classPrivateFieldGet(this, _RedisClient_options, "f").pingInterval), "f");
}, _RedisClient_sendCommand = function _RedisClient_sendCommand(args, options) {
    if (!__classPrivateFieldGet(this, _RedisClient_socket, "f").isOpen) {
        return Promise.reject(new errors_1.ClientClosedError());
    }
    else if (options?.isolated) {
        return this.executeIsolated(isolatedClient => isolatedClient.sendCommand(args, {
            ...options,
            isolated: false
        }));
    }
    else if (!__classPrivateFieldGet(this, _RedisClient_socket, "f").isReady && __classPrivateFieldGet(this, _RedisClient_options, "f")?.disableOfflineQueue) {
        return Promise.reject(new errors_1.ClientOfflineError());
    }
    const promise = __classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(args, options);
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this);
    return promise;
}, _RedisClient_pubSubCommand = function _RedisClient_pubSubCommand(promise) {
    if (promise === undefined)
        return Promise.resolve();
    __classPrivateFieldGet(this, _RedisClient_instances, "m", _RedisClient_tick).call(this);
    return promise;
}, _RedisClient_tick = function _RedisClient_tick(force = false) {
    if (__classPrivateFieldGet(this, _RedisClient_socket, "f").writableNeedDrain || (!force && !__classPrivateFieldGet(this, _RedisClient_socket, "f").isReady)) {
        return;
    }
    __classPrivateFieldGet(this, _RedisClient_socket, "f").cork();
    while (!__classPrivateFieldGet(this, _RedisClient_socket, "f").writableNeedDrain) {
        const args = __classPrivateFieldGet(this, _RedisClient_queue, "f").getCommandToSend();
        if (args === undefined)
            break;
        __classPrivateFieldGet(this, _RedisClient_socket, "f").writeCommand(args);
    }
}, _RedisClient_addMultiCommands = function _RedisClient_addMultiCommands(commands, chainId) {
    return Promise.all(commands.map(({ args }) => __classPrivateFieldGet(this, _RedisClient_queue, "f").addCommand(args, { chainId })));
}, _RedisClient_destroyIsolationPool = async function _RedisClient_destroyIsolationPool() {
    await __classPrivateFieldGet(this, _RedisClient_isolationPool, "f").drain();
    await __classPrivateFieldGet(this, _RedisClient_isolationPool, "f").clear();
    __classPrivateFieldSet(this, _RedisClient_isolationPool, undefined, "f");
};
exports.default = RedisClient;
(0, commander_1.attachCommands)({
    BaseClass: RedisClient,
    commands: commands_1.default,
    executor: RedisClient.prototype.commandsExecutor
});
RedisClient.prototype.Multi = multi_command_1.default;
