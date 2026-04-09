"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WsClient = exports.subprotocolsV3 = exports.subprotocolsV2 = void 0;
const client_js_1 = require("../client.js");
const index_js_1 = require("../encoding/index.js");
const errors_js_1 = require("../errors.js");
const id_alloc_js_1 = require("../id_alloc.js");
const result_js_1 = require("../result.js");
const sql_js_1 = require("../sql.js");
const util_js_1 = require("../util.js");
const stream_js_1 = require("./stream.js");
const json_encode_js_1 = require("./json_encode.js");
const protobuf_encode_js_1 = require("./protobuf_encode.js");
const json_decode_js_1 = require("./json_decode.js");
const protobuf_decode_js_1 = require("./protobuf_decode.js");
exports.subprotocolsV2 = new Map([
    ["hrana2", { version: 2, encoding: "json" }],
    ["hrana1", { version: 1, encoding: "json" }],
]);
exports.subprotocolsV3 = new Map([
    ["hrana3-protobuf", { version: 3, encoding: "protobuf" }],
    ["hrana3", { version: 3, encoding: "json" }],
    ["hrana2", { version: 2, encoding: "json" }],
    ["hrana1", { version: 1, encoding: "json" }],
]);
/** A client for the Hrana protocol over a WebSocket. */
class WsClient extends client_js_1.Client {
    #socket;
    // List of callbacks that we queue until the socket transitions from the CONNECTING to the OPEN state.
    #openCallbacks;
    // Have we already transitioned from CONNECTING to OPEN and fired the callbacks in #openCallbacks?
    #opened;
    // Stores the error that caused us to close the client (and the socket). If we are not closed, this is
    // `undefined`.
    #closed;
    // Have we received a response to our "hello" from the server?
    #recvdHello;
    // Subprotocol negotiated with the server. It is only available after the socket transitions to the OPEN
    // state.
    #subprotocol;
    // Has the `getVersion()` function been called? This is only used to validate that the API is used
    // correctly.
    #getVersionCalled;
    // A map from request id to the responses that we expect to receive from the server.
    #responseMap;
    // An allocator of request ids.
    #requestIdAlloc;
    // An allocator of stream ids.
    /** @private */
    _streamIdAlloc;
    // An allocator of cursor ids.
    /** @private */
    _cursorIdAlloc;
    // An allocator of SQL text ids.
    #sqlIdAlloc;
    /** @private */
    constructor(socket, jwt) {
        super();
        this.#socket = socket;
        this.#openCallbacks = [];
        this.#opened = false;
        this.#closed = undefined;
        this.#recvdHello = false;
        this.#subprotocol = undefined;
        this.#getVersionCalled = false;
        this.#responseMap = new Map();
        this.#requestIdAlloc = new id_alloc_js_1.IdAlloc();
        this._streamIdAlloc = new id_alloc_js_1.IdAlloc();
        this._cursorIdAlloc = new id_alloc_js_1.IdAlloc();
        this.#sqlIdAlloc = new id_alloc_js_1.IdAlloc();
        this.#socket.binaryType = "arraybuffer";
        this.#socket.addEventListener("open", () => this.#onSocketOpen());
        this.#socket.addEventListener("close", (event) => this.#onSocketClose(event));
        this.#socket.addEventListener("error", (event) => this.#onSocketError(event));
        this.#socket.addEventListener("message", (event) => this.#onSocketMessage(event));
        this.#send({ type: "hello", jwt });
    }
    // Send (or enqueue to send) a message to the server.
    #send(msg) {
        if (this.#closed !== undefined) {
            throw new errors_js_1.InternalError("Trying to send a message on a closed client");
        }
        if (this.#opened) {
            this.#sendToSocket(msg);
        }
        else {
            const openCallback = () => this.#sendToSocket(msg);
            const errorCallback = () => undefined;
            this.#openCallbacks.push({ openCallback, errorCallback });
        }
    }
    // The socket transitioned from CONNECTING to OPEN
    #onSocketOpen() {
        const protocol = this.#socket.protocol;
        if (protocol === undefined) {
            this.#setClosed(new errors_js_1.ClientError("The `WebSocket.protocol` property is undefined. This most likely means that the WebSocket " +
                "implementation provided by the environment is broken. If you are using Miniflare 2, " +
                "please update to Miniflare 3, which fixes this problem."));
            return;
        }
        else if (protocol === "") {
            this.#subprotocol = { version: 1, encoding: "json" };
        }
        else {
            this.#subprotocol = exports.subprotocolsV3.get(protocol);
            if (this.#subprotocol === undefined) {
                this.#setClosed(new errors_js_1.ProtoError(`Unrecognized WebSocket subprotocol: ${JSON.stringify(protocol)}`));
                return;
            }
        }
        for (const callbacks of this.#openCallbacks) {
            callbacks.openCallback();
        }
        this.#openCallbacks.length = 0;
        this.#opened = true;
    }
    #sendToSocket(msg) {
        const encoding = this.#subprotocol.encoding;
        if (encoding === "json") {
            const jsonMsg = (0, index_js_1.writeJsonObject)(msg, json_encode_js_1.ClientMsg);
            this.#socket.send(jsonMsg);
        }
        else if (encoding === "protobuf") {
            const protobufMsg = (0, index_js_1.writeProtobufMessage)(msg, protobuf_encode_js_1.ClientMsg);
            this.#socket.send(protobufMsg);
        }
        else {
            throw (0, util_js_1.impossible)(encoding, "Impossible encoding");
        }
    }
    /** Get the protocol version negotiated with the server, possibly waiting until the socket is open. */
    getVersion() {
        return new Promise((versionCallback, errorCallback) => {
            this.#getVersionCalled = true;
            if (this.#closed !== undefined) {
                errorCallback(this.#closed);
            }
            else if (!this.#opened) {
                const openCallback = () => versionCallback(this.#subprotocol.version);
                this.#openCallbacks.push({ openCallback, errorCallback });
            }
            else {
                versionCallback(this.#subprotocol.version);
            }
        });
    }
    // Make sure that the negotiated version is at least `minVersion`.
    /** @private */
    _ensureVersion(minVersion, feature) {
        if (this.#subprotocol === undefined || !this.#getVersionCalled) {
            throw new errors_js_1.ProtocolVersionError(`${feature} is supported only on protocol version ${minVersion} and higher, ` +
                "but the version supported by the WebSocket server is not yet known. " +
                "Use Client.getVersion() to wait until the version is available.");
        }
        else if (this.#subprotocol.version < minVersion) {
            throw new errors_js_1.ProtocolVersionError(`${feature} is supported on protocol version ${minVersion} and higher, ` +
                `but the WebSocket server only supports version ${this.#subprotocol.version}`);
        }
    }
    // Send a request to the server and invoke a callback when we get the response.
    /** @private */
    _sendRequest(request, callbacks) {
        if (this.#closed !== undefined) {
            callbacks.errorCallback(new errors_js_1.ClosedError("Client is closed", this.#closed));
            return;
        }
        const requestId = this.#requestIdAlloc.alloc();
        this.#responseMap.set(requestId, { ...callbacks, type: request.type });
        this.#send({ type: "request", requestId, request });
    }
    // The socket encountered an error.
    #onSocketError(event) {
        const eventMessage = event.message;
        const message = eventMessage ?? "WebSocket was closed due to an error";
        this.#setClosed(new errors_js_1.WebSocketError(message));
    }
    // The socket was closed.
    #onSocketClose(event) {
        let message = `WebSocket was closed with code ${event.code}`;
        if (event.reason) {
            message += `: ${event.reason}`;
        }
        this.#setClosed(new errors_js_1.WebSocketError(message));
    }
    // Close the client with the given error.
    #setClosed(error) {
        if (this.#closed !== undefined) {
            return;
        }
        this.#closed = error;
        for (const callbacks of this.#openCallbacks) {
            callbacks.errorCallback(error);
        }
        this.#openCallbacks.length = 0;
        for (const [requestId, responseState] of this.#responseMap.entries()) {
            responseState.errorCallback(error);
            this.#requestIdAlloc.free(requestId);
        }
        this.#responseMap.clear();
        this.#socket.close();
    }
    // We received a message from the socket.
    #onSocketMessage(event) {
        if (this.#closed !== undefined) {
            return;
        }
        try {
            let msg;
            const encoding = this.#subprotocol.encoding;
            if (encoding === "json") {
                if (typeof event.data !== "string") {
                    this.#socket.close(3003, "Only text messages are accepted with JSON encoding");
                    this.#setClosed(new errors_js_1.ProtoError("Received non-text message from server with JSON encoding"));
                    return;
                }
                msg = (0, index_js_1.readJsonObject)(JSON.parse(event.data), json_decode_js_1.ServerMsg);
            }
            else if (encoding === "protobuf") {
                if (!(event.data instanceof ArrayBuffer)) {
                    this.#socket.close(3003, "Only binary messages are accepted with Protobuf encoding");
                    this.#setClosed(new errors_js_1.ProtoError("Received non-binary message from server with Protobuf encoding"));
                    return;
                }
                msg = (0, index_js_1.readProtobufMessage)(new Uint8Array(event.data), protobuf_decode_js_1.ServerMsg);
            }
            else {
                throw (0, util_js_1.impossible)(encoding, "Impossible encoding");
            }
            this.#handleMsg(msg);
        }
        catch (e) {
            this.#socket.close(3007, "Could not handle message");
            this.#setClosed(e);
        }
    }
    // Handle a message from the server.
    #handleMsg(msg) {
        if (msg.type === "none") {
            throw new errors_js_1.ProtoError("Received an unrecognized ServerMsg");
        }
        else if (msg.type === "hello_ok" || msg.type === "hello_error") {
            if (this.#recvdHello) {
                throw new errors_js_1.ProtoError("Received a duplicated hello response");
            }
            this.#recvdHello = true;
            if (msg.type === "hello_error") {
                throw (0, result_js_1.errorFromProto)(msg.error);
            }
            return;
        }
        else if (!this.#recvdHello) {
            throw new errors_js_1.ProtoError("Received a non-hello message before a hello response");
        }
        if (msg.type === "response_ok") {
            const requestId = msg.requestId;
            const responseState = this.#responseMap.get(requestId);
            this.#responseMap.delete(requestId);
            if (responseState === undefined) {
                throw new errors_js_1.ProtoError("Received unexpected OK response");
            }
            this.#requestIdAlloc.free(requestId);
            try {
                if (responseState.type !== msg.response.type) {
                    console.dir({ responseState, msg });
                    throw new errors_js_1.ProtoError("Received unexpected type of response");
                }
                responseState.responseCallback(msg.response);
            }
            catch (e) {
                responseState.errorCallback(e);
                throw e;
            }
        }
        else if (msg.type === "response_error") {
            const requestId = msg.requestId;
            const responseState = this.#responseMap.get(requestId);
            this.#responseMap.delete(requestId);
            if (responseState === undefined) {
                throw new errors_js_1.ProtoError("Received unexpected error response");
            }
            this.#requestIdAlloc.free(requestId);
            responseState.errorCallback((0, result_js_1.errorFromProto)(msg.error));
        }
        else {
            throw (0, util_js_1.impossible)(msg, "Impossible ServerMsg type");
        }
    }
    /** Open a {@link WsStream}, a stream for executing SQL statements. */
    openStream() {
        return stream_js_1.WsStream.open(this);
    }
    /** Cache a SQL text on the server. This requires protocol version 2 or higher. */
    storeSql(sql) {
        this._ensureVersion(2, "storeSql()");
        const sqlId = this.#sqlIdAlloc.alloc();
        const sqlObj = new sql_js_1.Sql(this, sqlId);
        const responseCallback = () => undefined;
        const errorCallback = (e) => sqlObj._setClosed(e);
        const request = { type: "store_sql", sqlId, sql };
        this._sendRequest(request, { responseCallback, errorCallback });
        return sqlObj;
    }
    /** @private */
    _closeSql(sqlId) {
        if (this.#closed !== undefined) {
            return;
        }
        const responseCallback = () => this.#sqlIdAlloc.free(sqlId);
        const errorCallback = (e) => this.#setClosed(e);
        const request = { type: "close_sql", sqlId };
        this._sendRequest(request, { responseCallback, errorCallback });
    }
    /** Close the client and the WebSocket. */
    close() {
        this.#setClosed(new errors_js_1.ClientError("Client was manually closed"));
    }
    /** True if the client is closed. */
    get closed() {
        return this.#closed !== undefined;
    }
}
exports.WsClient = WsClient;
