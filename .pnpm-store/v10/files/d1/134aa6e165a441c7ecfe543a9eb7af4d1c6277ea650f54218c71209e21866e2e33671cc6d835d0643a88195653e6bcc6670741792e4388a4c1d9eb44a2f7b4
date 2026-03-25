"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commands_1 = require("@ioredis/commands");
const events_1 = require("events");
const standard_as_callback_1 = require("standard-as-callback");
const cluster_1 = require("./cluster");
const Command_1 = require("./Command");
const connectors_1 = require("./connectors");
const SentinelConnector_1 = require("./connectors/SentinelConnector");
const eventHandler = require("./redis/event_handler");
const RedisOptions_1 = require("./redis/RedisOptions");
const ScanStream_1 = require("./ScanStream");
const transaction_1 = require("./transaction");
const utils_1 = require("./utils");
const applyMixin_1 = require("./utils/applyMixin");
const Commander_1 = require("./utils/Commander");
const lodash_1 = require("./utils/lodash");
const Deque = require("denque");
const debug = (0, utils_1.Debug)("redis");
/**
 * This is the major component of ioredis.
 * Use it to connect to a standalone Redis server or Sentinels.
 *
 * ```typescript
 * const redis = new Redis(); // Default port is 6379
 * async function main() {
 *   redis.set("foo", "bar");
 *   redis.get("foo", (err, result) => {
 *     // `result` should be "bar"
 *     console.log(err, result);
 *   });
 *   // Or use Promise
 *   const result = await redis.get("foo");
 * }
 * ```
 */
class Redis extends Commander_1.default {
    constructor(arg1, arg2, arg3) {
        super();
        this.status = "wait";
        /**
         * @ignore
         */
        this.isCluster = false;
        this.reconnectTimeout = null;
        this.connectionEpoch = 0;
        this.retryAttempts = 0;
        this.manuallyClosing = false;
        // Prepare autopipelines structures
        this._autoPipelines = new Map();
        this._runningAutoPipelines = new Set();
        this.parseOptions(arg1, arg2, arg3);
        events_1.EventEmitter.call(this);
        this.resetCommandQueue();
        this.resetOfflineQueue();
        if (this.options.Connector) {
            this.connector = new this.options.Connector(this.options);
        }
        else if (this.options.sentinels) {
            const sentinelConnector = new SentinelConnector_1.default(this.options);
            sentinelConnector.emitter = this;
            this.connector = sentinelConnector;
        }
        else {
            this.connector = new connectors_1.StandaloneConnector(this.options);
        }
        if (this.options.scripts) {
            Object.entries(this.options.scripts).forEach(([name, definition]) => {
                this.defineCommand(name, definition);
            });
        }
        // end(or wait) -> connecting -> connect -> ready -> end
        if (this.options.lazyConnect) {
            this.setStatus("wait");
        }
        else {
            this.connect().catch(lodash_1.noop);
        }
    }
    /**
     * Create a Redis instance.
     * This is the same as `new Redis()` but is included for compatibility with node-redis.
     */
    static createClient(...args) {
        return new Redis(...args);
    }
    get autoPipelineQueueSize() {
        let queued = 0;
        for (const pipeline of this._autoPipelines.values()) {
            queued += pipeline.length;
        }
        return queued;
    }
    /**
     * Create a connection to Redis.
     * This method will be invoked automatically when creating a new Redis instance
     * unless `lazyConnect: true` is passed.
     *
     * When calling this method manually, a Promise is returned, which will
     * be resolved when the connection status is ready.
     */
    connect(callback) {
        const promise = new Promise((resolve, reject) => {
            if (this.status === "connecting" ||
                this.status === "connect" ||
                this.status === "ready") {
                reject(new Error("Redis is already connecting/connected"));
                return;
            }
            this.connectionEpoch += 1;
            this.setStatus("connecting");
            const { options } = this;
            this.condition = {
                select: options.db,
                auth: options.username
                    ? [options.username, options.password]
                    : options.password,
                subscriber: false,
            };
            const _this = this;
            (0, standard_as_callback_1.default)(this.connector.connect(function (type, err) {
                _this.silentEmit(type, err);
            }), function (err, stream) {
                if (err) {
                    _this.flushQueue(err);
                    _this.silentEmit("error", err);
                    reject(err);
                    _this.setStatus("end");
                    return;
                }
                let CONNECT_EVENT = options.tls ? "secureConnect" : "connect";
                if ("sentinels" in options &&
                    options.sentinels &&
                    !options.enableTLSForSentinelMode) {
                    CONNECT_EVENT = "connect";
                }
                _this.stream = stream;
                if (options.noDelay) {
                    stream.setNoDelay(true);
                }
                // Node ignores setKeepAlive before connect, therefore we wait for the event:
                // https://github.com/nodejs/node/issues/31663
                if (typeof options.keepAlive === "number") {
                    if (stream.connecting) {
                        stream.once(CONNECT_EVENT, () => {
                            stream.setKeepAlive(true, options.keepAlive);
                        });
                    }
                    else {
                        stream.setKeepAlive(true, options.keepAlive);
                    }
                }
                if (stream.connecting) {
                    stream.once(CONNECT_EVENT, eventHandler.connectHandler(_this));
                    if (options.connectTimeout) {
                        /*
                         * Typically, Socket#setTimeout(0) will clear the timer
                         * set before. However, in some platforms (Electron 3.x~4.x),
                         * the timer will not be cleared. So we introduce a variable here.
                         *
                         * See https://github.com/electron/electron/issues/14915
                         */
                        let connectTimeoutCleared = false;
                        stream.setTimeout(options.connectTimeout, function () {
                            if (connectTimeoutCleared) {
                                return;
                            }
                            stream.setTimeout(0);
                            stream.destroy();
                            const err = new Error("connect ETIMEDOUT");
                            // @ts-expect-error
                            err.errorno = "ETIMEDOUT";
                            // @ts-expect-error
                            err.code = "ETIMEDOUT";
                            // @ts-expect-error
                            err.syscall = "connect";
                            eventHandler.errorHandler(_this)(err);
                        });
                        stream.once(CONNECT_EVENT, function () {
                            connectTimeoutCleared = true;
                            stream.setTimeout(0);
                        });
                    }
                }
                else if (stream.destroyed) {
                    const firstError = _this.connector.firstError;
                    if (firstError) {
                        process.nextTick(() => {
                            eventHandler.errorHandler(_this)(firstError);
                        });
                    }
                    process.nextTick(eventHandler.closeHandler(_this));
                }
                else {
                    process.nextTick(eventHandler.connectHandler(_this));
                }
                if (!stream.destroyed) {
                    stream.once("error", eventHandler.errorHandler(_this));
                    stream.once("close", eventHandler.closeHandler(_this));
                }
                const connectionReadyHandler = function () {
                    _this.removeListener("close", connectionCloseHandler);
                    resolve();
                };
                var connectionCloseHandler = function () {
                    _this.removeListener("ready", connectionReadyHandler);
                    reject(new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG));
                };
                _this.once("ready", connectionReadyHandler);
                _this.once("close", connectionCloseHandler);
            });
        });
        return (0, standard_as_callback_1.default)(promise, callback);
    }
    /**
     * Disconnect from Redis.
     *
     * This method closes the connection immediately,
     * and may lose some pending replies that haven't written to client.
     * If you want to wait for the pending replies, use Redis#quit instead.
     */
    disconnect(reconnect = false) {
        if (!reconnect) {
            this.manuallyClosing = true;
        }
        if (this.reconnectTimeout && !reconnect) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.status === "wait") {
            eventHandler.closeHandler(this)();
        }
        else {
            this.connector.disconnect();
        }
    }
    /**
     * Disconnect from Redis.
     *
     * @deprecated
     */
    end() {
        this.disconnect();
    }
    /**
     * Create a new instance with the same options as the current one.
     *
     * @example
     * ```js
     * var redis = new Redis(6380);
     * var anotherRedis = redis.duplicate();
     * ```
     */
    duplicate(override) {
        return new Redis({ ...this.options, ...override });
    }
    /**
     * Mode of the connection.
     *
     * One of `"normal"`, `"subscriber"`, or `"monitor"`. When the connection is
     * not in `"normal"` mode, certain commands are not allowed.
     */
    get mode() {
        var _a;
        return this.options.monitor
            ? "monitor"
            : ((_a = this.condition) === null || _a === void 0 ? void 0 : _a.subscriber)
                ? "subscriber"
                : "normal";
    }
    /**
     * Listen for all requests received by the server in real time.
     *
     * This command will create a new connection to Redis and send a
     * MONITOR command via the new connection in order to avoid disturbing
     * the current connection.
     *
     * @param callback The callback function. If omit, a promise will be returned.
     * @example
     * ```js
     * var redis = new Redis();
     * redis.monitor(function (err, monitor) {
     *   // Entering monitoring mode.
     *   monitor.on('monitor', function (time, args, source, database) {
     *     console.log(time + ": " + util.inspect(args));
     *   });
     * });
     *
     * // supports promise as well as other commands
     * redis.monitor().then(function (monitor) {
     *   monitor.on('monitor', function (time, args, source, database) {
     *     console.log(time + ": " + util.inspect(args));
     *   });
     * });
     * ```
     */
    monitor(callback) {
        const monitorInstance = this.duplicate({
            monitor: true,
            lazyConnect: false,
        });
        return (0, standard_as_callback_1.default)(new Promise(function (resolve, reject) {
            monitorInstance.once("error", reject);
            monitorInstance.once("monitoring", function () {
                resolve(monitorInstance);
            });
        }), callback);
    }
    /**
     * Send a command to Redis
     *
     * This method is used internally and in most cases you should not
     * use it directly. If you need to send a command that is not supported
     * by the library, you can use the `call` method:
     *
     * ```js
     * const redis = new Redis();
     *
     * redis.call('set', 'foo', 'bar');
     * // or
     * redis.call(['set', 'foo', 'bar']);
     * ```
     *
     * @ignore
     */
    sendCommand(command, stream) {
        var _a, _b;
        if (this.status === "wait") {
            this.connect().catch(lodash_1.noop);
        }
        if (this.status === "end") {
            command.reject(new Error(utils_1.CONNECTION_CLOSED_ERROR_MSG));
            return command.promise;
        }
        if (((_a = this.condition) === null || _a === void 0 ? void 0 : _a.subscriber) &&
            !Command_1.default.checkFlag("VALID_IN_SUBSCRIBER_MODE", command.name)) {
            command.reject(new Error("Connection in subscriber mode, only subscriber commands may be used"));
            return command.promise;
        }
        if (typeof this.options.commandTimeout === "number") {
            command.setTimeout(this.options.commandTimeout);
        }
        let writable = this.status === "ready" ||
            (!stream &&
                this.status === "connect" &&
                (0, commands_1.exists)(command.name) &&
                (0, commands_1.hasFlag)(command.name, "loading"));
        if (!this.stream) {
            writable = false;
        }
        else if (!this.stream.writable) {
            writable = false;
            // @ts-expect-error
        }
        else if (this.stream._writableState && this.stream._writableState.ended) {
            // TODO: We should be able to remove this as the PR has already been merged.
            // https://github.com/iojs/io.js/pull/1217
            writable = false;
        }
        if (!writable) {
            if (!this.options.enableOfflineQueue) {
                command.reject(new Error("Stream isn't writeable and enableOfflineQueue options is false"));
                return command.promise;
            }
            if (command.name === "quit" && this.offlineQueue.length === 0) {
                this.disconnect();
                command.resolve(Buffer.from("OK"));
                return command.promise;
            }
            // @ts-expect-error
            if (debug.enabled) {
                debug("queue command[%s]: %d -> %s(%o)", this._getDescription(), this.condition.select, command.name, command.args);
            }
            this.offlineQueue.push({
                command: command,
                stream: stream,
                select: this.condition.select,
            });
        }
        else {
            // @ts-expect-error
            if (debug.enabled) {
                debug("write command[%s]: %d -> %s(%o)", this._getDescription(), (_b = this.condition) === null || _b === void 0 ? void 0 : _b.select, command.name, command.args);
            }
            if (stream) {
                if ("isPipeline" in stream && stream.isPipeline) {
                    stream.write(command.toWritable(stream.destination.redis.stream));
                }
                else {
                    stream.write(command.toWritable(stream));
                }
            }
            else {
                this.stream.write(command.toWritable(this.stream));
            }
            this.commandQueue.push({
                command: command,
                stream: stream,
                select: this.condition.select,
            });
            if (Command_1.default.checkFlag("WILL_DISCONNECT", command.name)) {
                this.manuallyClosing = true;
            }
        }
        if (command.name === "select" && (0, utils_1.isInt)(command.args[0])) {
            const db = parseInt(command.args[0], 10);
            if (this.condition.select !== db) {
                this.condition.select = db;
                this.emit("select", db);
                debug("switch to db [%d]", this.condition.select);
            }
        }
        return command.promise;
    }
    scanStream(options) {
        return this.createScanStream("scan", { options });
    }
    scanBufferStream(options) {
        return this.createScanStream("scanBuffer", { options });
    }
    sscanStream(key, options) {
        return this.createScanStream("sscan", { key, options });
    }
    sscanBufferStream(key, options) {
        return this.createScanStream("sscanBuffer", { key, options });
    }
    hscanStream(key, options) {
        return this.createScanStream("hscan", { key, options });
    }
    hscanBufferStream(key, options) {
        return this.createScanStream("hscanBuffer", { key, options });
    }
    zscanStream(key, options) {
        return this.createScanStream("zscan", { key, options });
    }
    zscanBufferStream(key, options) {
        return this.createScanStream("zscanBuffer", { key, options });
    }
    /**
     * Emit only when there's at least one listener.
     *
     * @ignore
     */
    silentEmit(eventName, arg) {
        let error;
        if (eventName === "error") {
            error = arg;
            if (this.status === "end") {
                return;
            }
            if (this.manuallyClosing) {
                // ignore connection related errors when manually disconnecting
                if (error instanceof Error &&
                    (error.message === utils_1.CONNECTION_CLOSED_ERROR_MSG ||
                        // @ts-expect-error
                        error.syscall === "connect" ||
                        // @ts-expect-error
                        error.syscall === "read")) {
                    return;
                }
            }
        }
        if (this.listeners(eventName).length > 0) {
            return this.emit.apply(this, arguments);
        }
        if (error && error instanceof Error) {
            console.error("[ioredis] Unhandled error event:", error.stack);
        }
        return false;
    }
    /**
     * @ignore
     */
    recoverFromFatalError(_commandError, err, options) {
        this.flushQueue(err, options);
        this.silentEmit("error", err);
        this.disconnect(true);
    }
    /**
     * @ignore
     */
    handleReconnection(err, item) {
        var _a;
        let needReconnect = false;
        if (this.options.reconnectOnError) {
            needReconnect = this.options.reconnectOnError(err);
        }
        switch (needReconnect) {
            case 1:
            case true:
                if (this.status !== "reconnecting") {
                    this.disconnect(true);
                }
                item.command.reject(err);
                break;
            case 2:
                if (this.status !== "reconnecting") {
                    this.disconnect(true);
                }
                if (((_a = this.condition) === null || _a === void 0 ? void 0 : _a.select) !== item.select &&
                    item.command.name !== "select") {
                    this.select(item.select);
                }
                // TODO
                // @ts-expect-error
                this.sendCommand(item.command);
                break;
            default:
                item.command.reject(err);
        }
    }
    /**
     * Get description of the connection. Used for debugging.
     */
    _getDescription() {
        let description;
        if ("path" in this.options && this.options.path) {
            description = this.options.path;
        }
        else if (this.stream &&
            this.stream.remoteAddress &&
            this.stream.remotePort) {
            description = this.stream.remoteAddress + ":" + this.stream.remotePort;
        }
        else if ("host" in this.options && this.options.host) {
            description = this.options.host + ":" + this.options.port;
        }
        else {
            // Unexpected
            description = "";
        }
        if (this.options.connectionName) {
            description += ` (${this.options.connectionName})`;
        }
        return description;
    }
    resetCommandQueue() {
        this.commandQueue = new Deque();
    }
    resetOfflineQueue() {
        this.offlineQueue = new Deque();
    }
    parseOptions(...args) {
        const options = {};
        let isTls = false;
        for (let i = 0; i < args.length; ++i) {
            const arg = args[i];
            if (arg === null || typeof arg === "undefined") {
                continue;
            }
            if (typeof arg === "object") {
                (0, lodash_1.defaults)(options, arg);
            }
            else if (typeof arg === "string") {
                (0, lodash_1.defaults)(options, (0, utils_1.parseURL)(arg));
                if (arg.startsWith("rediss://")) {
                    isTls = true;
                }
            }
            else if (typeof arg === "number") {
                options.port = arg;
            }
            else {
                throw new Error("Invalid argument " + arg);
            }
        }
        if (isTls) {
            (0, lodash_1.defaults)(options, { tls: true });
        }
        (0, lodash_1.defaults)(options, Redis.defaultOptions);
        if (typeof options.port === "string") {
            options.port = parseInt(options.port, 10);
        }
        if (typeof options.db === "string") {
            options.db = parseInt(options.db, 10);
        }
        // @ts-expect-error
        this.options = (0, utils_1.resolveTLSProfile)(options);
    }
    /**
     * Change instance's status
     */
    setStatus(status, arg) {
        // @ts-expect-error
        if (debug.enabled) {
            debug("status[%s]: %s -> %s", this._getDescription(), this.status || "[empty]", status);
        }
        this.status = status;
        process.nextTick(this.emit.bind(this, status, arg));
    }
    createScanStream(command, { key, options = {} }) {
        return new ScanStream_1.default({
            objectMode: true,
            key: key,
            redis: this,
            command: command,
            ...options,
        });
    }
    /**
     * Flush offline queue and command queue with error.
     *
     * @param error The error object to send to the commands
     * @param options options
     */
    flushQueue(error, options) {
        options = (0, lodash_1.defaults)({}, options, {
            offlineQueue: true,
            commandQueue: true,
        });
        let item;
        if (options.offlineQueue) {
            while ((item = this.offlineQueue.shift())) {
                item.command.reject(error);
            }
        }
        if (options.commandQueue) {
            if (this.commandQueue.length > 0) {
                if (this.stream) {
                    this.stream.removeAllListeners("data");
                }
                while ((item = this.commandQueue.shift())) {
                    item.command.reject(error);
                }
            }
        }
    }
    /**
     * Check whether Redis has finished loading the persistent data and is able to
     * process commands.
     */
    _readyCheck(callback) {
        const _this = this;
        this.info(function (err, res) {
            if (err) {
                if (err.message && err.message.includes("NOPERM")) {
                    console.warn(`Skipping the ready check because INFO command fails: "${err.message}". You can disable ready check with "enableReadyCheck". More: https://github.com/luin/ioredis/wiki/Disable-ready-check.`);
                    return callback(null, {});
                }
                return callback(err);
            }
            if (typeof res !== "string") {
                return callback(null, res);
            }
            const info = {};
            const lines = res.split("\r\n");
            for (let i = 0; i < lines.length; ++i) {
                const [fieldName, ...fieldValueParts] = lines[i].split(":");
                const fieldValue = fieldValueParts.join(":");
                if (fieldValue) {
                    info[fieldName] = fieldValue;
                }
            }
            if (!info.loading || info.loading === "0") {
                callback(null, info);
            }
            else {
                const loadingEtaMs = (info.loading_eta_seconds || 1) * 1000;
                const retryTime = _this.options.maxLoadingRetryTime &&
                    _this.options.maxLoadingRetryTime < loadingEtaMs
                    ? _this.options.maxLoadingRetryTime
                    : loadingEtaMs;
                debug("Redis server still loading, trying again in " + retryTime + "ms");
                setTimeout(function () {
                    _this._readyCheck(callback);
                }, retryTime);
            }
        }).catch(lodash_1.noop);
    }
}
Redis.Cluster = cluster_1.default;
Redis.Command = Command_1.default;
/**
 * Default options
 */
Redis.defaultOptions = RedisOptions_1.DEFAULT_REDIS_OPTIONS;
(0, applyMixin_1.default)(Redis, events_1.EventEmitter);
(0, transaction_1.addTransactionSupport)(Redis.prototype);
exports.default = Redis;
