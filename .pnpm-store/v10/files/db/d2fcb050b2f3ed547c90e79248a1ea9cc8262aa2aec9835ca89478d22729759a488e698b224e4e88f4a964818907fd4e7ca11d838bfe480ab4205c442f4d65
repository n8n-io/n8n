"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsTransaction = exports.WsClient = exports._createClient = exports.createClient = void 0;
const hrana = __importStar(require("@libsql/hrana-client"));
const api_1 = require("@libsql/core/api");
const config_1 = require("@libsql/core/config");
const hrana_js_1 = require("./hrana.js");
const sql_cache_js_1 = require("./sql_cache.js");
const uri_1 = require("@libsql/core/uri");
const util_1 = require("@libsql/core/util");
const promise_limit_1 = __importDefault(require("promise-limit"));
__exportStar(require("@libsql/core/api"), exports);
function createClient(config) {
    return _createClient((0, config_1.expandConfig)(config, false));
}
exports.createClient = createClient;
/** @private */
function _createClient(config) {
    if (config.scheme !== "wss" && config.scheme !== "ws") {
        throw new api_1.LibsqlError('The WebSocket client supports only "libsql:", "wss:" and "ws:" URLs, ' +
            `got ${JSON.stringify(config.scheme + ":")}. For more information, please read ${util_1.supportedUrlLink}`, "URL_SCHEME_NOT_SUPPORTED");
    }
    if (config.encryptionKey !== undefined) {
        throw new api_1.LibsqlError("Encryption key is not supported by the remote client.", "ENCRYPTION_KEY_NOT_SUPPORTED");
    }
    if (config.scheme === "ws" && config.tls) {
        throw new api_1.LibsqlError(`A "ws:" URL cannot opt into TLS by using ?tls=1`, "URL_INVALID");
    }
    else if (config.scheme === "wss" && !config.tls) {
        throw new api_1.LibsqlError(`A "wss:" URL cannot opt out of TLS by using ?tls=0`, "URL_INVALID");
    }
    const url = (0, uri_1.encodeBaseUrl)(config.scheme, config.authority, config.path);
    let client;
    try {
        client = hrana.openWs(url, config.authToken);
    }
    catch (e) {
        if (e instanceof hrana.WebSocketUnsupportedError) {
            const suggestedScheme = config.scheme === "wss" ? "https" : "http";
            const suggestedUrl = (0, uri_1.encodeBaseUrl)(suggestedScheme, config.authority, config.path);
            throw new api_1.LibsqlError("This environment does not support WebSockets, please switch to the HTTP client by using " +
                `a "${suggestedScheme}:" URL (${JSON.stringify(suggestedUrl)}). ` +
                `For more information, please read ${util_1.supportedUrlLink}`, "WEBSOCKETS_NOT_SUPPORTED");
        }
        throw (0, hrana_js_1.mapHranaError)(e);
    }
    return new WsClient(client, url, config.authToken, config.intMode, config.concurrency);
}
exports._createClient = _createClient;
const maxConnAgeMillis = 60 * 1000;
const sqlCacheCapacity = 100;
class WsClient {
    #url;
    #authToken;
    #intMode;
    // State of the current connection. The `hrana.WsClient` inside may be closed at any moment due to an
    // asynchronous error.
    #connState;
    // If defined, this is a connection that will be used in the future, once it is ready.
    #futureConnState;
    closed;
    protocol;
    #isSchemaDatabase;
    #promiseLimitFunction;
    /** @private */
    constructor(client, url, authToken, intMode, concurrency) {
        this.#url = url;
        this.#authToken = authToken;
        this.#intMode = intMode;
        this.#connState = this.#openConn(client);
        this.#futureConnState = undefined;
        this.closed = false;
        this.protocol = "ws";
        this.#promiseLimitFunction = (0, promise_limit_1.default)(concurrency);
    }
    async limit(fn) {
        return this.#promiseLimitFunction(fn);
    }
    async execute(stmtOrSql, args) {
        let stmt;
        if (typeof stmtOrSql === "string") {
            stmt = {
                sql: stmtOrSql,
                args: args || [],
            };
        }
        else {
            stmt = stmtOrSql;
        }
        return this.limit(async () => {
            const streamState = await this.#openStream();
            try {
                const hranaStmt = (0, hrana_js_1.stmtToHrana)(stmt);
                // Schedule all operations synchronously, so they will be pipelined and executed in a single
                // network roundtrip.
                streamState.conn.sqlCache.apply([hranaStmt]);
                const hranaRowsPromise = streamState.stream.query(hranaStmt);
                streamState.stream.closeGracefully();
                const hranaRowsResult = await hranaRowsPromise;
                return (0, hrana_js_1.resultSetFromHrana)(hranaRowsResult);
            }
            catch (e) {
                throw (0, hrana_js_1.mapHranaError)(e);
            }
            finally {
                this._closeStream(streamState);
            }
        });
    }
    async batch(stmts, mode = "deferred") {
        return this.limit(async () => {
            const streamState = await this.#openStream();
            try {
                const normalizedStmts = stmts.map((stmt) => {
                    if (Array.isArray(stmt)) {
                        return {
                            sql: stmt[0],
                            args: stmt[1] || [],
                        };
                    }
                    return stmt;
                });
                const hranaStmts = normalizedStmts.map(hrana_js_1.stmtToHrana);
                const version = await streamState.conn.client.getVersion();
                // Schedule all operations synchronously, so they will be pipelined and executed in a single
                // network roundtrip.
                streamState.conn.sqlCache.apply(hranaStmts);
                const batch = streamState.stream.batch(version >= 3);
                const resultsPromise = (0, hrana_js_1.executeHranaBatch)(mode, version, batch, hranaStmts);
                const results = await resultsPromise;
                return results;
            }
            catch (e) {
                throw (0, hrana_js_1.mapHranaError)(e);
            }
            finally {
                this._closeStream(streamState);
            }
        });
    }
    async migrate(stmts) {
        return this.limit(async () => {
            const streamState = await this.#openStream();
            try {
                const hranaStmts = stmts.map(hrana_js_1.stmtToHrana);
                const version = await streamState.conn.client.getVersion();
                // Schedule all operations synchronously, so they will be pipelined and executed in a single
                // network roundtrip.
                const batch = streamState.stream.batch(version >= 3);
                const resultsPromise = (0, hrana_js_1.executeHranaBatch)("deferred", version, batch, hranaStmts, true);
                const results = await resultsPromise;
                return results;
            }
            catch (e) {
                throw (0, hrana_js_1.mapHranaError)(e);
            }
            finally {
                this._closeStream(streamState);
            }
        });
    }
    async transaction(mode = "write") {
        return this.limit(async () => {
            const streamState = await this.#openStream();
            try {
                const version = await streamState.conn.client.getVersion();
                // the BEGIN statement will be batched with the first statement on the transaction to save a
                // network roundtrip
                return new WsTransaction(this, streamState, mode, version);
            }
            catch (e) {
                this._closeStream(streamState);
                throw (0, hrana_js_1.mapHranaError)(e);
            }
        });
    }
    async executeMultiple(sql) {
        return this.limit(async () => {
            const streamState = await this.#openStream();
            try {
                // Schedule all operations synchronously, so they will be pipelined and executed in a single
                // network roundtrip.
                const promise = streamState.stream.sequence(sql);
                streamState.stream.closeGracefully();
                await promise;
            }
            catch (e) {
                throw (0, hrana_js_1.mapHranaError)(e);
            }
            finally {
                this._closeStream(streamState);
            }
        });
    }
    sync() {
        throw new api_1.LibsqlError("sync not supported in ws mode", "SYNC_NOT_SUPPORTED");
    }
    async #openStream() {
        if (this.closed) {
            throw new api_1.LibsqlError("The client is closed", "CLIENT_CLOSED");
        }
        const now = new Date();
        const ageMillis = now.valueOf() - this.#connState.openTime.valueOf();
        if (ageMillis > maxConnAgeMillis &&
            this.#futureConnState === undefined) {
            // The existing connection is too old, let's open a new one.
            const futureConnState = this.#openConn();
            this.#futureConnState = futureConnState;
            // However, if we used `futureConnState` immediately, we would introduce additional latency,
            // because we would have to wait for the WebSocket handshake to complete, even though we may a
            // have perfectly good existing connection in `this.#connState`!
            //
            // So we wait until the `hrana.Client.getVersion()` operation completes (which happens when the
            // WebSocket hanshake completes), and only then we replace `this.#connState` with
            // `futureConnState`, which is stored in `this.#futureConnState` in the meantime.
            futureConnState.client.getVersion().then((_version) => {
                if (this.#connState !== futureConnState) {
                    // We need to close `this.#connState` before we replace it. However, it is possible
                    // that `this.#connState` has already been replaced: see the code below.
                    if (this.#connState.streamStates.size === 0) {
                        this.#connState.client.close();
                    }
                    else {
                        // If there are existing streams on the connection, we must not close it, because
                        // these streams would be broken. The last stream to be closed will also close the
                        // connection in `_closeStream()`.
                    }
                }
                this.#connState = futureConnState;
                this.#futureConnState = undefined;
            }, (_e) => {
                // If the new connection could not be established, let's just ignore the error and keep
                // using the existing connection.
                this.#futureConnState = undefined;
            });
        }
        if (this.#connState.client.closed) {
            // An error happened on this connection and it has been closed. Let's try to seamlessly reconnect.
            try {
                if (this.#futureConnState !== undefined) {
                    // We are already in the process of opening a new connection, so let's just use it
                    // immediately.
                    this.#connState = this.#futureConnState;
                }
                else {
                    this.#connState = this.#openConn();
                }
            }
            catch (e) {
                throw (0, hrana_js_1.mapHranaError)(e);
            }
        }
        const connState = this.#connState;
        try {
            // Now we wait for the WebSocket handshake to complete (if it hasn't completed yet). Note that
            // this does not increase latency, because any messages that we would send on the WebSocket before
            // the handshake would be queued until the handshake is completed anyway.
            if (connState.useSqlCache === undefined) {
                connState.useSqlCache =
                    (await connState.client.getVersion()) >= 2;
                if (connState.useSqlCache) {
                    connState.sqlCache.capacity = sqlCacheCapacity;
                }
            }
            const stream = connState.client.openStream();
            stream.intMode = this.#intMode;
            const streamState = { conn: connState, stream };
            connState.streamStates.add(streamState);
            return streamState;
        }
        catch (e) {
            throw (0, hrana_js_1.mapHranaError)(e);
        }
    }
    #openConn(client) {
        try {
            client ??= hrana.openWs(this.#url, this.#authToken);
            return {
                client,
                useSqlCache: undefined,
                sqlCache: new sql_cache_js_1.SqlCache(client, 0),
                openTime: new Date(),
                streamStates: new Set(),
            };
        }
        catch (e) {
            throw (0, hrana_js_1.mapHranaError)(e);
        }
    }
    async reconnect() {
        try {
            for (const st of Array.from(this.#connState.streamStates)) {
                try {
                    st.stream.close();
                }
                catch { }
            }
            this.#connState.client.close();
        }
        catch { }
        if (this.#futureConnState) {
            try {
                this.#futureConnState.client.close();
            }
            catch { }
            this.#futureConnState = undefined;
        }
        const next = this.#openConn();
        const version = await next.client.getVersion();
        next.useSqlCache = version >= 2;
        if (next.useSqlCache) {
            next.sqlCache.capacity = sqlCacheCapacity;
        }
        this.#connState = next;
        this.closed = false;
    }
    _closeStream(streamState) {
        streamState.stream.close();
        const connState = streamState.conn;
        connState.streamStates.delete(streamState);
        if (connState.streamStates.size === 0 &&
            connState !== this.#connState) {
            // We are not using this connection anymore and this is the last stream that was using it, so we
            // must close it now.
            connState.client.close();
        }
    }
    close() {
        this.#connState.client.close();
        this.closed = true;
        if (this.#futureConnState) {
            try {
                this.#futureConnState.client.close();
            }
            catch { }
            this.#futureConnState = undefined;
        }
        this.closed = true;
    }
}
exports.WsClient = WsClient;
class WsTransaction extends hrana_js_1.HranaTransaction {
    #client;
    #streamState;
    /** @private */
    constructor(client, state, mode, version) {
        super(mode, version);
        this.#client = client;
        this.#streamState = state;
    }
    /** @private */
    _getStream() {
        return this.#streamState.stream;
    }
    /** @private */
    _getSqlCache() {
        return this.#streamState.conn.sqlCache;
    }
    close() {
        this.#client._closeStream(this.#streamState);
    }
    get closed() {
        return this.#streamState.stream.closed;
    }
}
exports.WsTransaction = WsTransaction;
