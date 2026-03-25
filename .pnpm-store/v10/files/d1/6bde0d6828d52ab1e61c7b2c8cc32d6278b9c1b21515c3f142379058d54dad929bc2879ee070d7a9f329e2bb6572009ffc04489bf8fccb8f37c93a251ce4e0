"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFetchHttpClient = createFetchHttpClient;
const AbortError_js_1 = require("./abort-controller/AbortError.js");
const restError_js_1 = require("./restError.js");
const httpHeaders_js_1 = require("./httpHeaders.js");
const typeGuards_js_1 = require("./util/typeGuards.js");
/**
 * Checks if the body is a Blob or Blob-like
 */
function isBlob(body) {
    // File objects count as a type of Blob, so we want to use instanceof explicitly
    return (typeof Blob === "function" || typeof Blob === "object") && body instanceof Blob;
}
/**
 * A HttpClient implementation that uses window.fetch to send HTTP requests.
 * @internal
 */
class FetchHttpClient {
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
        if (request.proxySettings) {
            throw new Error("HTTP proxy is not supported in browser environment");
        }
        try {
            return await makeRequest(request);
        }
        catch (e) {
            throw getError(e, request);
        }
    }
}
/**
 * Sends a request
 */
async function makeRequest(request) {
    const { abortController, abortControllerCleanup } = setupAbortSignal(request);
    try {
        const headers = buildFetchHeaders(request.headers);
        const { streaming, body: requestBody } = buildRequestBody(request);
        const requestInit = Object.assign(Object.assign({ body: requestBody, method: request.method, headers: headers, signal: abortController.signal }, ("credentials" in Request.prototype
            ? { credentials: request.withCredentials ? "include" : "same-origin" }
            : {})), ("cache" in Request.prototype ? { cache: "no-store" } : {}));
        // According to https://fetch.spec.whatwg.org/#fetch-method,
        // init.duplex must be set when body is a ReadableStream object.
        // currently "half" is the only valid value.
        if (streaming) {
            requestInit.duplex = "half";
        }
        /**
         * Developers of the future:
         * Do not set redirect: "manual" as part
         * of request options.
         * It will not work as you expect.
         */
        const response = await fetch(request.url, Object.assign(Object.assign({}, requestInit), request.requestOverrides));
        // If we're uploading a blob, we need to fire the progress event manually
        if (isBlob(request.body) && request.onUploadProgress) {
            request.onUploadProgress({ loadedBytes: request.body.size });
        }
        return buildPipelineResponse(response, request, abortControllerCleanup);
    }
    catch (e) {
        abortControllerCleanup === null || abortControllerCleanup === void 0 ? void 0 : abortControllerCleanup();
        throw e;
    }
}
/**
 * Creates a pipeline response from a Fetch response;
 */
async function buildPipelineResponse(httpResponse, request, abortControllerCleanup) {
    var _a, _b;
    const headers = buildPipelineHeaders(httpResponse);
    const response = {
        request,
        headers,
        status: httpResponse.status,
    };
    const bodyStream = (0, typeGuards_js_1.isWebReadableStream)(httpResponse.body)
        ? buildBodyStream(httpResponse.body, {
            onProgress: request.onDownloadProgress,
            onEnd: abortControllerCleanup,
        })
        : httpResponse.body;
    if (
    // Value of POSITIVE_INFINITY in streamResponseStatusCodes is considered as any status code
    ((_a = request.streamResponseStatusCodes) === null || _a === void 0 ? void 0 : _a.has(Number.POSITIVE_INFINITY)) ||
        ((_b = request.streamResponseStatusCodes) === null || _b === void 0 ? void 0 : _b.has(response.status))) {
        if (request.enableBrowserStreams) {
            response.browserStreamBody = bodyStream !== null && bodyStream !== void 0 ? bodyStream : undefined;
        }
        else {
            const responseStream = new Response(bodyStream);
            response.blobBody = responseStream.blob();
            abortControllerCleanup === null || abortControllerCleanup === void 0 ? void 0 : abortControllerCleanup();
        }
    }
    else {
        const responseStream = new Response(bodyStream);
        response.bodyAsText = await responseStream.text();
        abortControllerCleanup === null || abortControllerCleanup === void 0 ? void 0 : abortControllerCleanup();
    }
    return response;
}
function setupAbortSignal(request) {
    const abortController = new AbortController();
    // Cleanup function
    let abortControllerCleanup;
    /**
     * Attach an abort listener to the request
     */
    let abortListener;
    if (request.abortSignal) {
        if (request.abortSignal.aborted) {
            throw new AbortError_js_1.AbortError("The operation was aborted. Request has already been canceled.");
        }
        abortListener = (event) => {
            if (event.type === "abort") {
                abortController.abort();
            }
        };
        request.abortSignal.addEventListener("abort", abortListener);
        abortControllerCleanup = () => {
            var _a;
            if (abortListener) {
                (_a = request.abortSignal) === null || _a === void 0 ? void 0 : _a.removeEventListener("abort", abortListener);
            }
        };
    }
    // If a timeout was passed, call the abort signal once the time elapses
    if (request.timeout > 0) {
        setTimeout(() => {
            abortController.abort();
        }, request.timeout);
    }
    return { abortController, abortControllerCleanup };
}
/**
 * Gets the specific error
 */
// eslint-disable-next-line @azure/azure-sdk/ts-use-interface-parameters
function getError(e, request) {
    var _a;
    if (e && (e === null || e === void 0 ? void 0 : e.name) === "AbortError") {
        return e;
    }
    else {
        return new restError_js_1.RestError(`Error sending request: ${e.message}`, {
            code: (_a = e === null || e === void 0 ? void 0 : e.code) !== null && _a !== void 0 ? _a : restError_js_1.RestError.REQUEST_SEND_ERROR,
            request,
        });
    }
}
/**
 * Converts PipelineRequest headers to Fetch headers
 */
function buildFetchHeaders(pipelineHeaders) {
    const headers = new Headers();
    for (const [name, value] of pipelineHeaders) {
        headers.append(name, value);
    }
    return headers;
}
function buildPipelineHeaders(httpResponse) {
    const responseHeaders = (0, httpHeaders_js_1.createHttpHeaders)();
    for (const [name, value] of httpResponse.headers) {
        responseHeaders.set(name, value);
    }
    return responseHeaders;
}
function buildRequestBody(request) {
    const body = typeof request.body === "function" ? request.body() : request.body;
    if ((0, typeGuards_js_1.isNodeReadableStream)(body)) {
        throw new Error("Node streams are not supported in browser environment.");
    }
    return (0, typeGuards_js_1.isWebReadableStream)(body)
        ? { streaming: true, body: buildBodyStream(body, { onProgress: request.onUploadProgress }) }
        : { streaming: false, body };
}
/**
 * Reads the request/response original stream and stream it through a new
 * ReadableStream, this is done to be able to report progress in a way that
 * all modern browsers support. TransformStreams would be an alternative,
 * however they are not yet supported by all browsers i.e Firefox
 */
function buildBodyStream(readableStream, options = {}) {
    let loadedBytes = 0;
    const { onProgress, onEnd } = options;
    // If the current browser supports pipeThrough we use a TransformStream
    // to report progress
    if (isTransformStreamSupported(readableStream)) {
        return readableStream.pipeThrough(new TransformStream({
            transform(chunk, controller) {
                if (chunk === null) {
                    controller.terminate();
                    return;
                }
                controller.enqueue(chunk);
                loadedBytes += chunk.length;
                if (onProgress) {
                    onProgress({ loadedBytes });
                }
            },
            flush() {
                onEnd === null || onEnd === void 0 ? void 0 : onEnd();
            },
        }));
    }
    else {
        // If we can't use transform streams, wrap the original stream in a new readable stream
        // and use pull to enqueue each chunk and report progress.
        const reader = readableStream.getReader();
        return new ReadableStream({
            async pull(controller) {
                var _a;
                const { done, value } = await reader.read();
                // When no more data needs to be consumed, break the reading
                if (done || !value) {
                    onEnd === null || onEnd === void 0 ? void 0 : onEnd();
                    // Close the stream
                    controller.close();
                    reader.releaseLock();
                    return;
                }
                loadedBytes += (_a = value === null || value === void 0 ? void 0 : value.length) !== null && _a !== void 0 ? _a : 0;
                // Enqueue the next data chunk into our target stream
                controller.enqueue(value);
                if (onProgress) {
                    onProgress({ loadedBytes });
                }
            },
            cancel(reason) {
                onEnd === null || onEnd === void 0 ? void 0 : onEnd();
                return reader.cancel(reason);
            },
        });
    }
}
/**
 * Create a new HttpClient instance for the browser environment.
 * @internal
 */
function createFetchHttpClient() {
    return new FetchHttpClient();
}
function isTransformStreamSupported(readableStream) {
    return readableStream.pipeThrough !== undefined && self.TransformStream !== undefined;
}
//# sourceMappingURL=fetchHttpClient.js.map