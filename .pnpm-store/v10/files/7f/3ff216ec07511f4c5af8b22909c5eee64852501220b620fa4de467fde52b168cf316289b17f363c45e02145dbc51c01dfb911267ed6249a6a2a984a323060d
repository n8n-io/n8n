// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import * as http from "http";
import * as https from "https";
import * as zlib from "zlib";
import { Transform } from "stream";
import { AbortController, AbortError } from "@azure/abort-controller";
import { createHttpHeaders } from "./httpHeaders";
import { RestError } from "./restError";
import { logger } from "./log";
const DEFAULT_TLS_SETTINGS = {};
function isReadableStream(body) {
    return body && typeof body.pipe === "function";
}
function isStreamComplete(stream) {
    return new Promise((resolve) => {
        stream.on("close", resolve);
        stream.on("end", resolve);
        stream.on("error", resolve);
    });
}
function isArrayBuffer(body) {
    return body && typeof body.byteLength === "number";
}
class ReportTransform extends Transform {
    constructor(progressCallback) {
        super();
        this.loadedBytes = 0;
        this.progressCallback = progressCallback;
    }
    // eslint-disable-next-line @typescript-eslint/ban-types
    _transform(chunk, _encoding, callback) {
        this.push(chunk);
        this.loadedBytes += chunk.length;
        try {
            this.progressCallback({ loadedBytes: this.loadedBytes });
            callback();
        }
        catch (e) {
            callback(e);
        }
    }
}
/**
 * A HttpClient implementation that uses Node's "https" module to send HTTPS requests.
 * @internal
 */
class NodeHttpClient {
    constructor() {
        this.cachedHttpsAgents = new WeakMap();
    }
    /**
     * Makes a request over an underlying transport layer and returns the response.
     * @param request - The request to be made.
     */
    async sendRequest(request) {
        var _a, _b, _c;
        const abortController = new AbortController();
        let abortListener;
        if (request.abortSignal) {
            if (request.abortSignal.aborted) {
                throw new AbortError("The operation was aborted.");
            }
            abortListener = (event) => {
                if (event.type === "abort") {
                    abortController.abort();
                }
            };
            request.abortSignal.addEventListener("abort", abortListener);
        }
        if (request.timeout > 0) {
            setTimeout(() => {
                abortController.abort();
            }, request.timeout);
        }
        const acceptEncoding = request.headers.get("Accept-Encoding");
        const shouldDecompress = (acceptEncoding === null || acceptEncoding === void 0 ? void 0 : acceptEncoding.includes("gzip")) || (acceptEncoding === null || acceptEncoding === void 0 ? void 0 : acceptEncoding.includes("deflate"));
        let body = typeof request.body === "function" ? request.body() : request.body;
        if (body && !request.headers.has("Content-Length")) {
            const bodyLength = getBodyLength(body);
            if (bodyLength !== null) {
                request.headers.set("Content-Length", bodyLength);
            }
        }
        let responseStream;
        try {
            if (body && request.onUploadProgress) {
                const onUploadProgress = request.onUploadProgress;
                const uploadReportStream = new ReportTransform(onUploadProgress);
                uploadReportStream.on("error", (e) => {
                    logger.error("Error in upload progress", e);
                });
                if (isReadableStream(body)) {
                    body.pipe(uploadReportStream);
                }
                else {
                    uploadReportStream.end(body);
                }
                body = uploadReportStream;
            }
            const res = await this.makeRequest(request, abortController, body);
            const headers = getResponseHeaders(res);
            const status = (_a = res.statusCode) !== null && _a !== void 0 ? _a : 0;
            const response = {
                status,
                headers,
                request,
            };
            // Responses to HEAD must not have a body.
            // If they do return a body, that body must be ignored.
            if (request.method === "HEAD") {
                res.destroy();
                return response;
            }
            responseStream = shouldDecompress ? getDecodedResponseStream(res, headers) : res;
            const onDownloadProgress = request.onDownloadProgress;
            if (onDownloadProgress) {
                const downloadReportStream = new ReportTransform(onDownloadProgress);
                downloadReportStream.on("error", (e) => {
                    logger.error("Error in download progress", e);
                });
                responseStream.pipe(downloadReportStream);
                responseStream = downloadReportStream;
            }
            if (
            // Value of POSITIVE_INFINITY in streamResponseStatusCodes is considered as any status code
            ((_b = request.streamResponseStatusCodes) === null || _b === void 0 ? void 0 : _b.has(Number.POSITIVE_INFINITY)) ||
                ((_c = request.streamResponseStatusCodes) === null || _c === void 0 ? void 0 : _c.has(response.status))) {
                response.readableStreamBody = responseStream;
            }
            else {
                response.bodyAsText = await streamToText(responseStream);
            }
            return response;
        }
        finally {
            // clean up event listener
            if (request.abortSignal && abortListener) {
                let uploadStreamDone = Promise.resolve();
                if (isReadableStream(body)) {
                    uploadStreamDone = isStreamComplete(body);
                }
                let downloadStreamDone = Promise.resolve();
                if (isReadableStream(responseStream)) {
                    downloadStreamDone = isStreamComplete(responseStream);
                }
                Promise.all([uploadStreamDone, downloadStreamDone])
                    .then(() => {
                    var _a;
                    // eslint-disable-next-line promise/always-return
                    if (abortListener) {
                        (_a = request.abortSignal) === null || _a === void 0 ? void 0 : _a.removeEventListener("abort", abortListener);
                    }
                })
                    .catch((e) => {
                    logger.warning("Error when cleaning up abortListener on httpRequest", e);
                });
            }
        }
    }
    makeRequest(request, abortController, body) {
        var _a;
        const url = new URL(request.url);
        const isInsecure = url.protocol !== "https:";
        if (isInsecure && !request.allowInsecureConnection) {
            throw new Error(`Cannot connect to ${request.url} while allowInsecureConnection is false.`);
        }
        const agent = (_a = request.agent) !== null && _a !== void 0 ? _a : this.getOrCreateAgent(request, isInsecure);
        const options = {
            agent,
            hostname: url.hostname,
            path: `${url.pathname}${url.search}`,
            port: url.port,
            method: request.method,
            headers: request.headers.toJSON({ preserveCase: true }),
        };
        return new Promise((resolve, reject) => {
            const req = isInsecure ? http.request(options, resolve) : https.request(options, resolve);
            req.once("error", (err) => {
                var _a;
                reject(new RestError(err.message, { code: (_a = err.code) !== null && _a !== void 0 ? _a : RestError.REQUEST_SEND_ERROR, request }));
            });
            abortController.signal.addEventListener("abort", () => {
                const abortError = new AbortError("The operation was aborted.");
                req.destroy(abortError);
                reject(abortError);
            });
            if (body && isReadableStream(body)) {
                body.pipe(req);
            }
            else if (body) {
                if (typeof body === "string" || Buffer.isBuffer(body)) {
                    req.end(body);
                }
                else if (isArrayBuffer(body)) {
                    req.end(ArrayBuffer.isView(body) ? Buffer.from(body.buffer) : Buffer.from(body));
                }
                else {
                    logger.error("Unrecognized body type", body);
                    reject(new RestError("Unrecognized body type"));
                }
            }
            else {
                // streams don't like "undefined" being passed as data
                req.end();
            }
        });
    }
    getOrCreateAgent(request, isInsecure) {
        var _a;
        const disableKeepAlive = request.disableKeepAlive;
        // Handle Insecure requests first
        if (isInsecure) {
            if (disableKeepAlive) {
                // keepAlive:false is the default so we don't need a custom Agent
                return http.globalAgent;
            }
            if (!this.cachedHttpAgent) {
                // If there is no cached agent create a new one and cache it.
                this.cachedHttpAgent = new http.Agent({ keepAlive: true });
            }
            return this.cachedHttpAgent;
        }
        else {
            if (disableKeepAlive && !request.tlsSettings) {
                // When there are no tlsSettings and keepAlive is false
                // we don't need a custom agent
                return https.globalAgent;
            }
            // We use the tlsSettings to index cached clients
            const tlsSettings = (_a = request.tlsSettings) !== null && _a !== void 0 ? _a : DEFAULT_TLS_SETTINGS;
            // Get the cached agent or create a new one with the
            // provided values for keepAlive and tlsSettings
            let agent = this.cachedHttpsAgents.get(tlsSettings);
            if (agent && agent.options.keepAlive === !disableKeepAlive) {
                return agent;
            }
            logger.info("No cached TLS Agent exist, creating a new Agent");
            agent = new https.Agent(Object.assign({ 
                // keepAlive is true if disableKeepAlive is false.
                keepAlive: !disableKeepAlive }, tlsSettings));
            this.cachedHttpsAgents.set(tlsSettings, agent);
            return agent;
        }
    }
}
function getResponseHeaders(res) {
    const headers = createHttpHeaders();
    for (const header of Object.keys(res.headers)) {
        const value = res.headers[header];
        if (Array.isArray(value)) {
            if (value.length > 0) {
                headers.set(header, value[0]);
            }
        }
        else if (value) {
            headers.set(header, value);
        }
    }
    return headers;
}
function getDecodedResponseStream(stream, headers) {
    const contentEncoding = headers.get("Content-Encoding");
    if (contentEncoding === "gzip") {
        const unzip = zlib.createGunzip();
        stream.pipe(unzip);
        return unzip;
    }
    else if (contentEncoding === "deflate") {
        const inflate = zlib.createInflate();
        stream.pipe(inflate);
        return inflate;
    }
    return stream;
}
function streamToText(stream) {
    return new Promise((resolve, reject) => {
        const buffer = [];
        stream.on("data", (chunk) => {
            if (Buffer.isBuffer(chunk)) {
                buffer.push(chunk);
            }
            else {
                buffer.push(Buffer.from(chunk));
            }
        });
        stream.on("end", () => {
            resolve(Buffer.concat(buffer).toString("utf8"));
        });
        stream.on("error", (e) => {
            if (e && (e === null || e === void 0 ? void 0 : e.name) === "AbortError") {
                reject(e);
            }
            else {
                reject(new RestError(`Error reading response as text: ${e.message}`, {
                    code: RestError.PARSE_ERROR,
                }));
            }
        });
    });
}
/** @internal */
export function getBodyLength(body) {
    if (!body) {
        return 0;
    }
    else if (Buffer.isBuffer(body)) {
        return body.length;
    }
    else if (isReadableStream(body)) {
        return null;
    }
    else if (isArrayBuffer(body)) {
        return body.byteLength;
    }
    else if (typeof body === "string") {
        return Buffer.from(body).length;
    }
    else {
        return null;
    }
}
/**
 * Create a new HttpClient instance for the NodeJS environment.
 * @internal
 */
export function createNodeHttpClient() {
    return new NodeHttpClient();
}
//# sourceMappingURL=nodeHttpClient.js.map