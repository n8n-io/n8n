"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpStream = void 0;
const cross_fetch_1 = require("cross-fetch");
const errors_js_1 = require("../errors.js");
const index_js_1 = require("../encoding/index.js");
const id_alloc_js_1 = require("../id_alloc.js");
const queue_js_1 = require("../queue.js");
const queue_microtask_js_1 = require("../queue_microtask.js");
const result_js_1 = require("../result.js");
const sql_js_1 = require("../sql.js");
const stream_js_1 = require("../stream.js");
const util_js_1 = require("../util.js");
const cursor_js_1 = require("./cursor.js");
const json_encode_js_1 = require("./json_encode.js");
const protobuf_encode_js_1 = require("./protobuf_encode.js");
const json_encode_js_2 = require("./json_encode.js");
const protobuf_encode_js_2 = require("./protobuf_encode.js");
const json_decode_js_1 = require("./json_decode.js");
const protobuf_decode_js_1 = require("./protobuf_decode.js");
class HttpStream extends stream_js_1.Stream {
    #client;
    #baseUrl;
    #jwt;
    #fetch;
    #remoteEncryptionKey;
    #baton;
    #queue;
    #flushing;
    #cursor;
    #closing;
    #closeQueued;
    #closed;
    #sqlIdAlloc;
    /** @private */
    constructor(client, baseUrl, jwt, customFetch, remoteEncryptionKey) {
        super(client.intMode);
        this.#client = client;
        this.#baseUrl = baseUrl.toString();
        this.#jwt = jwt;
        this.#fetch = customFetch;
        this.#remoteEncryptionKey = remoteEncryptionKey;
        this.#baton = undefined;
        this.#queue = new queue_js_1.Queue();
        this.#flushing = false;
        this.#closing = false;
        this.#closeQueued = false;
        this.#closed = undefined;
        this.#sqlIdAlloc = new id_alloc_js_1.IdAlloc();
    }
    /** Get the {@link HttpClient} object that this stream belongs to. */
    client() {
        return this.#client;
    }
    /** @private */
    _sqlOwner() {
        return this;
    }
    /** Cache a SQL text on the server. */
    storeSql(sql) {
        const sqlId = this.#sqlIdAlloc.alloc();
        this.#sendStreamRequest({ type: "store_sql", sqlId, sql }).then(() => undefined, (error) => this._setClosed(error));
        return new sql_js_1.Sql(this, sqlId);
    }
    /** @private */
    _closeSql(sqlId) {
        if (this.#closed !== undefined) {
            return;
        }
        this.#sendStreamRequest({ type: "close_sql", sqlId }).then(() => this.#sqlIdAlloc.free(sqlId), (error) => this._setClosed(error));
    }
    /** @private */
    _execute(stmt) {
        return this.#sendStreamRequest({ type: "execute", stmt }).then((response) => {
            return response.result;
        });
    }
    /** @private */
    _batch(batch) {
        return this.#sendStreamRequest({ type: "batch", batch }).then((response) => {
            return response.result;
        });
    }
    /** @private */
    _describe(protoSql) {
        return this.#sendStreamRequest({
            type: "describe",
            sql: protoSql.sql,
            sqlId: protoSql.sqlId
        }).then((response) => {
            return response.result;
        });
    }
    /** @private */
    _sequence(protoSql) {
        return this.#sendStreamRequest({
            type: "sequence",
            sql: protoSql.sql,
            sqlId: protoSql.sqlId,
        }).then((_response) => {
            return undefined;
        });
    }
    /** Check whether the SQL connection underlying this stream is in autocommit state (i.e., outside of an
     * explicit transaction). This requires protocol version 3 or higher.
     */
    getAutocommit() {
        this.#client._ensureVersion(3, "getAutocommit()");
        return this.#sendStreamRequest({
            type: "get_autocommit",
        }).then((response) => {
            return response.isAutocommit;
        });
    }
    #sendStreamRequest(request) {
        return new Promise((responseCallback, errorCallback) => {
            this.#pushToQueue({ type: "pipeline", request, responseCallback, errorCallback });
        });
    }
    /** @private */
    _openCursor(batch) {
        return new Promise((cursorCallback, errorCallback) => {
            this.#pushToQueue({ type: "cursor", batch, cursorCallback, errorCallback });
        });
    }
    /** @private */
    _cursorClosed(cursor) {
        if (cursor !== this.#cursor) {
            throw new errors_js_1.InternalError("Cursor was closed, but it was not associated with the stream");
        }
        this.#cursor = undefined;
        (0, queue_microtask_js_1.queueMicrotask)(() => this.#flushQueue());
    }
    /** Immediately close the stream. */
    close() {
        this._setClosed(new errors_js_1.ClientError("Stream was manually closed"));
    }
    /** Gracefully close the stream. */
    closeGracefully() {
        this.#closing = true;
        (0, queue_microtask_js_1.queueMicrotask)(() => this.#flushQueue());
    }
    /** True if the stream is closed. */
    get closed() {
        return this.#closed !== undefined || this.#closing;
    }
    /** @private */
    _setClosed(error) {
        if (this.#closed !== undefined) {
            return;
        }
        this.#closed = error;
        if (this.#cursor !== undefined) {
            this.#cursor._setClosed(error);
        }
        this.#client._streamClosed(this);
        for (;;) {
            const entry = this.#queue.shift();
            if (entry !== undefined) {
                entry.errorCallback(error);
            }
            else {
                break;
            }
        }
        if ((this.#baton !== undefined || this.#flushing) && !this.#closeQueued) {
            this.#queue.push({
                type: "pipeline",
                request: { type: "close" },
                responseCallback: () => undefined,
                errorCallback: () => undefined,
            });
            this.#closeQueued = true;
            (0, queue_microtask_js_1.queueMicrotask)(() => this.#flushQueue());
        }
    }
    #pushToQueue(entry) {
        if (this.#closed !== undefined) {
            throw new errors_js_1.ClosedError("Stream is closed", this.#closed);
        }
        else if (this.#closing) {
            throw new errors_js_1.ClosedError("Stream is closing", undefined);
        }
        else {
            this.#queue.push(entry);
            (0, queue_microtask_js_1.queueMicrotask)(() => this.#flushQueue());
        }
    }
    #flushQueue() {
        if (this.#flushing || this.#cursor !== undefined) {
            return;
        }
        if (this.#closing && this.#queue.length === 0) {
            this._setClosed(new errors_js_1.ClientError("Stream was gracefully closed"));
            return;
        }
        const endpoint = this.#client._endpoint;
        if (endpoint === undefined) {
            this.#client._endpointPromise.then(() => this.#flushQueue(), (error) => this._setClosed(error));
            return;
        }
        const firstEntry = this.#queue.shift();
        if (firstEntry === undefined) {
            return;
        }
        else if (firstEntry.type === "pipeline") {
            const pipeline = [firstEntry];
            for (;;) {
                const entry = this.#queue.first();
                if (entry !== undefined && entry.type === "pipeline") {
                    pipeline.push(entry);
                    this.#queue.shift();
                }
                else if (entry === undefined && this.#closing && !this.#closeQueued) {
                    pipeline.push({
                        type: "pipeline",
                        request: { type: "close" },
                        responseCallback: () => undefined,
                        errorCallback: () => undefined,
                    });
                    this.#closeQueued = true;
                    break;
                }
                else {
                    break;
                }
            }
            this.#flushPipeline(endpoint, pipeline);
        }
        else if (firstEntry.type === "cursor") {
            this.#flushCursor(endpoint, firstEntry);
        }
        else {
            throw (0, util_js_1.impossible)(firstEntry, "Impossible type of QueueEntry");
        }
    }
    #flushPipeline(endpoint, pipeline) {
        this.#flush(() => this.#createPipelineRequest(pipeline, endpoint), (resp) => decodePipelineResponse(resp, endpoint.encoding), (respBody) => respBody.baton, (respBody) => respBody.baseUrl, (respBody) => handlePipelineResponse(pipeline, respBody), (error) => pipeline.forEach((entry) => entry.errorCallback(error)));
    }
    #flushCursor(endpoint, entry) {
        const cursor = new cursor_js_1.HttpCursor(this, endpoint.encoding);
        this.#cursor = cursor;
        this.#flush(() => this.#createCursorRequest(entry, endpoint), (resp) => cursor.open(resp), (respBody) => respBody.baton, (respBody) => respBody.baseUrl, (_respBody) => entry.cursorCallback(cursor), (error) => entry.errorCallback(error));
    }
    #flush(createRequest, decodeResponse, getBaton, getBaseUrl, handleResponse, handleError) {
        let promise;
        try {
            const request = createRequest();
            const fetch = this.#fetch;
            promise = fetch(request);
        }
        catch (error) {
            promise = Promise.reject(error);
        }
        this.#flushing = true;
        promise.then((resp) => {
            if (!resp.ok) {
                return errorFromResponse(resp).then((error) => {
                    throw error;
                });
            }
            return decodeResponse(resp);
        }).then((r) => {
            this.#baton = getBaton(r);
            this.#baseUrl = getBaseUrl(r) ?? this.#baseUrl;
            handleResponse(r);
        }).catch((error) => {
            this._setClosed(error);
            handleError(error);
        }).finally(() => {
            this.#flushing = false;
            this.#flushQueue();
        });
    }
    #createPipelineRequest(pipeline, endpoint) {
        return this.#createRequest(new URL(endpoint.pipelinePath, this.#baseUrl), {
            baton: this.#baton,
            requests: pipeline.map((entry) => entry.request),
        }, endpoint.encoding, json_encode_js_1.PipelineReqBody, protobuf_encode_js_1.PipelineReqBody);
    }
    #createCursorRequest(entry, endpoint) {
        if (endpoint.cursorPath === undefined) {
            throw new errors_js_1.ProtocolVersionError("Cursors are supported only on protocol version 3 and higher, " +
                `but the HTTP server only supports version ${endpoint.version}.`);
        }
        return this.#createRequest(new URL(endpoint.cursorPath, this.#baseUrl), {
            baton: this.#baton,
            batch: entry.batch,
        }, endpoint.encoding, json_encode_js_2.CursorReqBody, protobuf_encode_js_2.CursorReqBody);
    }
    #createRequest(url, reqBody, encoding, jsonFun, protobufFun) {
        let bodyData;
        let contentType;
        if (encoding === "json") {
            bodyData = (0, index_js_1.writeJsonObject)(reqBody, jsonFun);
            contentType = "application/json";
        }
        else if (encoding === "protobuf") {
            bodyData = (0, index_js_1.writeProtobufMessage)(reqBody, protobufFun);
            contentType = "application/x-protobuf";
        }
        else {
            throw (0, util_js_1.impossible)(encoding, "Impossible encoding");
        }
        const headers = new cross_fetch_1.Headers();
        headers.set("content-type", contentType);
        if (this.#jwt !== undefined) {
            headers.set("authorization", `Bearer ${this.#jwt}`);
        }
        if (this.#remoteEncryptionKey !== undefined) {
            headers.set("x-turso-encryption-key", this.#remoteEncryptionKey);
        }
        return new cross_fetch_1.Request(url.toString(), { method: "POST", headers, body: bodyData });
    }
}
exports.HttpStream = HttpStream;
function handlePipelineResponse(pipeline, respBody) {
    if (respBody.results.length !== pipeline.length) {
        throw new errors_js_1.ProtoError("Server returned unexpected number of pipeline results");
    }
    for (let i = 0; i < pipeline.length; ++i) {
        const result = respBody.results[i];
        const entry = pipeline[i];
        if (result.type === "ok") {
            if (result.response.type !== entry.request.type) {
                throw new errors_js_1.ProtoError("Received unexpected type of response");
            }
            entry.responseCallback(result.response);
        }
        else if (result.type === "error") {
            entry.errorCallback((0, result_js_1.errorFromProto)(result.error));
        }
        else if (result.type === "none") {
            throw new errors_js_1.ProtoError("Received unrecognized type of StreamResult");
        }
        else {
            throw (0, util_js_1.impossible)(result, "Received impossible type of StreamResult");
        }
    }
}
async function decodePipelineResponse(resp, encoding) {
    if (encoding === "json") {
        const respJson = await resp.json();
        return (0, index_js_1.readJsonObject)(respJson, json_decode_js_1.PipelineRespBody);
    }
    if (encoding === "protobuf") {
        const respData = await resp.arrayBuffer();
        return (0, index_js_1.readProtobufMessage)(new Uint8Array(respData), protobuf_decode_js_1.PipelineRespBody);
    }
    await resp.body?.cancel();
    throw (0, util_js_1.impossible)(encoding, "Impossible encoding");
}
async function errorFromResponse(resp) {
    const respType = resp.headers.get("content-type") ?? "text/plain";
    let message = `Server returned HTTP status ${resp.status}`;
    if (respType === "application/json") {
        const respBody = await resp.json();
        if ("message" in respBody) {
            return (0, result_js_1.errorFromProto)(respBody);
        }
        return new errors_js_1.HttpServerError(message, resp.status);
    }
    if (respType === "text/plain") {
        const respBody = (await resp.text()).trim();
        if (respBody !== "") {
            message += `: ${respBody}`;
        }
        return new errors_js_1.HttpServerError(message, resp.status);
    }
    await resp.body?.cancel();
    return new errors_js_1.HttpServerError(message, resp.status);
}
