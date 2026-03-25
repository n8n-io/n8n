"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createXhrHttpClient = createXhrHttpClient;
const AbortError_js_1 = require("./abort-controller/AbortError.js");
const httpHeaders_js_1 = require("./httpHeaders.js");
const restError_js_1 = require("./restError.js");
const typeGuards_js_1 = require("./util/typeGuards.js");
const arrayBuffer_js_1 = require("./util/arrayBuffer.js");
/**
 * A HttpClient implementation that uses XMLHttpRequest to send HTTP requests.
 * @internal
 */
class XhrHttpClient {
    /**
     * Makes a request over an underlying transport layer and returns the response.
     * @param request - The request to be made.
     */
    async sendRequest(request) {
        const url = new URL(request.url);
        const isInsecure = url.protocol !== "https:";
        if (isInsecure && !request.allowInsecureConnection) {
            throw new Error(`Cannot connect to ${request.url} while allowInsecureConnection is false.`);
        }
        const xhr = new XMLHttpRequest();
        if (request.proxySettings) {
            throw new Error("HTTP proxy is not supported in browser environment");
        }
        const abortSignal = request.abortSignal;
        if (abortSignal) {
            if (abortSignal.aborted) {
                throw new AbortError_js_1.AbortError("The operation was aborted. Request has already been canceled.");
            }
            const listener = () => {
                xhr.abort();
            };
            abortSignal.addEventListener("abort", listener);
            xhr.addEventListener("readystatechange", () => {
                if (xhr.readyState === XMLHttpRequest.DONE) {
                    abortSignal.removeEventListener("abort", listener);
                }
            });
        }
        addProgressListener(xhr.upload, request.onUploadProgress);
        addProgressListener(xhr, request.onDownloadProgress);
        xhr.open(request.method, request.url);
        xhr.timeout = request.timeout;
        xhr.withCredentials = request.withCredentials;
        for (const [name, value] of request.headers) {
            xhr.setRequestHeader(name, value);
        }
        xhr.responseType = request.streamResponseStatusCodes?.size ? "blob" : "text";
        const body = typeof request.body === "function" ? request.body() : request.body;
        if ((0, typeGuards_js_1.isReadableStream)(body)) {
            throw new Error("streams are not supported in XhrHttpClient.");
        }
        if (body instanceof ArrayBuffer) {
            xhr.send(body);
        }
        else if (typeof body === "object" && body && "buffer" in body) {
            xhr.send((0, arrayBuffer_js_1.arrayBufferViewToArrayBuffer)(body));
        }
        else {
            xhr.send(body === undefined ? null : body);
        }
        if (xhr.responseType === "blob") {
            return new Promise((resolve, reject) => {
                handleBlobResponse(xhr, request, resolve, reject);
                rejectOnTerminalEvent(request, xhr, reject);
            });
        }
        else {
            return new Promise(function (resolve, reject) {
                xhr.addEventListener("load", () => resolve({
                    request,
                    status: xhr.status,
                    headers: parseHeaders(xhr),
                    bodyAsText: xhr.responseText,
                }));
                rejectOnTerminalEvent(request, xhr, reject);
            });
        }
    }
}
function handleBlobResponse(xhr, request, res, rej) {
    xhr.addEventListener("readystatechange", () => {
        // Resolve as soon as headers are loaded
        if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
            if (
            // Value of POSITIVE_INFINITY in streamResponseStatusCodes is considered as any status code
            request.streamResponseStatusCodes?.has(Number.POSITIVE_INFINITY) ||
                request.streamResponseStatusCodes?.has(xhr.status)) {
                const blobBody = new Promise((resolve, reject) => {
                    xhr.addEventListener("load", () => {
                        resolve(xhr.response);
                    });
                    rejectOnTerminalEvent(request, xhr, reject);
                });
                res({
                    request,
                    status: xhr.status,
                    headers: parseHeaders(xhr),
                    blobBody,
                });
            }
            else {
                xhr.addEventListener("load", () => {
                    // xhr.response is of Blob type if the request is sent with xhr.responseType === "blob"
                    // but the status code is not one of the stream response status codes,
                    // so treat it as text and convert from Blob to text
                    if (xhr.response) {
                        xhr.response
                            .text()
                            .then((text) => {
                            res({
                                request: request,
                                status: xhr.status,
                                headers: parseHeaders(xhr),
                                bodyAsText: text,
                            });
                            return;
                        })
                            .catch((e) => {
                            rej(e);
                        });
                    }
                    else {
                        res({
                            request,
                            status: xhr.status,
                            headers: parseHeaders(xhr),
                        });
                    }
                });
            }
        }
    });
}
function addProgressListener(xhr, listener) {
    if (listener) {
        xhr.addEventListener("progress", (rawEvent) => listener({
            loadedBytes: rawEvent.loaded,
        }));
    }
}
function parseHeaders(xhr) {
    const responseHeaders = (0, httpHeaders_js_1.createHttpHeaders)();
    const headerLines = xhr
        .getAllResponseHeaders()
        .trim()
        .split(/[\r\n]+/);
    for (const line of headerLines) {
        const index = line.indexOf(":");
        const headerName = line.slice(0, index);
        const headerValue = line.slice(index + 2);
        responseHeaders.set(headerName, headerValue);
    }
    return responseHeaders;
}
function rejectOnTerminalEvent(request, xhr, reject) {
    xhr.addEventListener("error", () => reject(new restError_js_1.RestError(`Failed to send request to ${request.url}`, {
        code: restError_js_1.RestError.REQUEST_SEND_ERROR,
        request,
    })));
    const abortError = new AbortError_js_1.AbortError("The operation was aborted.");
    xhr.addEventListener("abort", () => reject(abortError));
    xhr.addEventListener("timeout", () => reject(abortError));
}
/**
 * Create a new HttpClient instance for the browser environment.
 * @internal
 */
function createXhrHttpClient() {
    return new XhrHttpClient();
}
//# sourceMappingURL=xhrHttpClient.js.map