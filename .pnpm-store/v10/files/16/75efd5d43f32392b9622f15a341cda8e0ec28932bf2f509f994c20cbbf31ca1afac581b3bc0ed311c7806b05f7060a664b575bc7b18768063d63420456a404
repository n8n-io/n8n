import { Request, Headers } from "cross-fetch";
import { ClientError, HttpServerError, ProtocolVersionError, ProtoError, ClosedError, InternalError, } from "../errors.js";
import { readJsonObject, writeJsonObject, readProtobufMessage, writeProtobufMessage, } from "../encoding/index.js";
import { IdAlloc } from "../id_alloc.js";
import { Queue } from "../queue.js";
import { queueMicrotask } from "../queue_microtask.js";
import { errorFromProto } from "../result.js";
import { Sql } from "../sql.js";
import { Stream } from "../stream.js";
import { impossible } from "../util.js";
import { HttpCursor } from "./cursor.js";
import { PipelineReqBody as json_PipelineReqBody } from "./json_encode.js";
import { PipelineReqBody as protobuf_PipelineReqBody } from "./protobuf_encode.js";
import { CursorReqBody as json_CursorReqBody } from "./json_encode.js";
import { CursorReqBody as protobuf_CursorReqBody } from "./protobuf_encode.js";
import { PipelineRespBody as json_PipelineRespBody } from "./json_decode.js";
import { PipelineRespBody as protobuf_PipelineRespBody } from "./protobuf_decode.js";
export class HttpStream extends Stream {
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
        this.#queue = new Queue();
        this.#flushing = false;
        this.#closing = false;
        this.#closeQueued = false;
        this.#closed = undefined;
        this.#sqlIdAlloc = new IdAlloc();
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
        return new Sql(this, sqlId);
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
            throw new InternalError("Cursor was closed, but it was not associated with the stream");
        }
        this.#cursor = undefined;
        queueMicrotask(() => this.#flushQueue());
    }
    /** Immediately close the stream. */
    close() {
        this._setClosed(new ClientError("Stream was manually closed"));
    }
    /** Gracefully close the stream. */
    closeGracefully() {
        this.#closing = true;
        queueMicrotask(() => this.#flushQueue());
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
            queueMicrotask(() => this.#flushQueue());
        }
    }
    #pushToQueue(entry) {
        if (this.#closed !== undefined) {
            throw new ClosedError("Stream is closed", this.#closed);
        }
        else if (this.#closing) {
            throw new ClosedError("Stream is closing", undefined);
        }
        else {
            this.#queue.push(entry);
            queueMicrotask(() => this.#flushQueue());
        }
    }
    #flushQueue() {
        if (this.#flushing || this.#cursor !== undefined) {
            return;
        }
        if (this.#closing && this.#queue.length === 0) {
            this._setClosed(new ClientError("Stream was gracefully closed"));
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
            throw impossible(firstEntry, "Impossible type of QueueEntry");
        }
    }
    #flushPipeline(endpoint, pipeline) {
        this.#flush(() => this.#createPipelineRequest(pipeline, endpoint), (resp) => decodePipelineResponse(resp, endpoint.encoding), (respBody) => respBody.baton, (respBody) => respBody.baseUrl, (respBody) => handlePipelineResponse(pipeline, respBody), (error) => pipeline.forEach((entry) => entry.errorCallback(error)));
    }
    #flushCursor(endpoint, entry) {
        const cursor = new HttpCursor(this, endpoint.encoding);
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
        }, endpoint.encoding, json_PipelineReqBody, protobuf_PipelineReqBody);
    }
    #createCursorRequest(entry, endpoint) {
        if (endpoint.cursorPath === undefined) {
            throw new ProtocolVersionError("Cursors are supported only on protocol version 3 and higher, " +
                `but the HTTP server only supports version ${endpoint.version}.`);
        }
        return this.#createRequest(new URL(endpoint.cursorPath, this.#baseUrl), {
            baton: this.#baton,
            batch: entry.batch,
        }, endpoint.encoding, json_CursorReqBody, protobuf_CursorReqBody);
    }
    #createRequest(url, reqBody, encoding, jsonFun, protobufFun) {
        let bodyData;
        let contentType;
        if (encoding === "json") {
            bodyData = writeJsonObject(reqBody, jsonFun);
            contentType = "application/json";
        }
        else if (encoding === "protobuf") {
            bodyData = writeProtobufMessage(reqBody, protobufFun);
            contentType = "application/x-protobuf";
        }
        else {
            throw impossible(encoding, "Impossible encoding");
        }
        const headers = new Headers();
        headers.set("content-type", contentType);
        if (this.#jwt !== undefined) {
            headers.set("authorization", `Bearer ${this.#jwt}`);
        }
        if (this.#remoteEncryptionKey !== undefined) {
            headers.set("x-turso-encryption-key", this.#remoteEncryptionKey);
        }
        return new Request(url.toString(), { method: "POST", headers, body: bodyData });
    }
}
function handlePipelineResponse(pipeline, respBody) {
    if (respBody.results.length !== pipeline.length) {
        throw new ProtoError("Server returned unexpected number of pipeline results");
    }
    for (let i = 0; i < pipeline.length; ++i) {
        const result = respBody.results[i];
        const entry = pipeline[i];
        if (result.type === "ok") {
            if (result.response.type !== entry.request.type) {
                throw new ProtoError("Received unexpected type of response");
            }
            entry.responseCallback(result.response);
        }
        else if (result.type === "error") {
            entry.errorCallback(errorFromProto(result.error));
        }
        else if (result.type === "none") {
            throw new ProtoError("Received unrecognized type of StreamResult");
        }
        else {
            throw impossible(result, "Received impossible type of StreamResult");
        }
    }
}
async function decodePipelineResponse(resp, encoding) {
    if (encoding === "json") {
        const respJson = await resp.json();
        return readJsonObject(respJson, json_PipelineRespBody);
    }
    if (encoding === "protobuf") {
        const respData = await resp.arrayBuffer();
        return readProtobufMessage(new Uint8Array(respData), protobuf_PipelineRespBody);
    }
    await resp.body?.cancel();
    throw impossible(encoding, "Impossible encoding");
}
async function errorFromResponse(resp) {
    const respType = resp.headers.get("content-type") ?? "text/plain";
    let message = `Server returned HTTP status ${resp.status}`;
    if (respType === "application/json") {
        const respBody = await resp.json();
        if ("message" in respBody) {
            return errorFromProto(respBody);
        }
        return new HttpServerError(message, resp.status);
    }
    if (respType === "text/plain") {
        const respBody = (await resp.text()).trim();
        if (respBody !== "") {
            message += `: ${respBody}`;
        }
        return new HttpServerError(message, resp.status);
    }
    await resp.body?.cancel();
    return new HttpServerError(message, resp.status);
}
