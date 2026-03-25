// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { AbortError } from "@azure/abort-controller";
import { RestError } from "./restError";
import { createHttpHeaders } from "./httpHeaders";
/**
 * Checks if the body is a NodeReadable stream which is not supported in Browsers
 */
function isNodeReadableStream(body) {
    return body && typeof body.pipe === "function";
}
/**
 * Checks if the body is a ReadableStream supported by browsers
 */
function isReadableStream(body) {
    return Boolean(body &&
        typeof body.getReader === "function" &&
        typeof body.tee === "function");
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
        const requestBody = buildRequestBody(request);
        /**
         * Developers of the future:
         * Do not set redirect: "manual" as part
         * of request options.
         * It will not work as you expect.
         */
        const response = await fetch(request.url, {
            body: requestBody,
            method: request.method,
            headers: headers,
            signal: abortController.signal,
            credentials: request.withCredentials ? "include" : "same-origin",
            cache: "no-store",
        });
        return buildPipelineResponse(response, request);
    }
    finally {
        if (abortControllerCleanup) {
            abortControllerCleanup();
        }
    }
}
/**
 * Creates a pipeline response from a Fetch response;
 */
async function buildPipelineResponse(httpResponse, request) {
    var _a, _b;
    const headers = buildPipelineHeaders(httpResponse);
    const response = {
        request,
        headers,
        status: httpResponse.status,
    };
    const bodyStream = isReadableStream(httpResponse.body)
        ? buildBodyStream(httpResponse.body, request.onDownloadProgress)
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
        }
    }
    else {
        const responseStream = new Response(bodyStream);
        response.bodyAsText = await responseStream.text();
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
            throw new AbortError("The operation was aborted.");
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
function getError(e, request) {
    var _a;
    if (e && (e === null || e === void 0 ? void 0 : e.name) === "AbortError") {
        return e;
    }
    else {
        return new RestError(`Error sending request: ${e.message}`, {
            code: (_a = e === null || e === void 0 ? void 0 : e.code) !== null && _a !== void 0 ? _a : RestError.REQUEST_SEND_ERROR,
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
    const responseHeaders = createHttpHeaders();
    for (const [name, value] of httpResponse.headers) {
        responseHeaders.set(name, value);
    }
    return responseHeaders;
}
function buildRequestBody(request) {
    const body = typeof request.body === "function" ? request.body() : request.body;
    if (isNodeReadableStream(body)) {
        throw new Error("Node streams are not supported in browser environment.");
    }
    return isReadableStream(body) ? buildBodyStream(body, request.onUploadProgress) : body;
}
/**
 * Reads the request/response original stream and stream it through a new
 * ReadableStream, this is done to be able to report progress in a way that
 * all modern browsers support. TransformStreams would be an alternative,
 * however they are not yet supported by all browsers i.e Firefox
 */
function buildBodyStream(readableStream, onProgress) {
    let loadedBytes = 0;
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
        });
    }
}
/**
 * Create a new HttpClient instance for the browser environment.
 * @internal
 */
export function createFetchHttpClient() {
    return new FetchHttpClient();
}
function isTransformStreamSupported(readableStream) {
    return readableStream.pipeThrough !== undefined && self.TransformStream !== undefined;
}
//# sourceMappingURL=fetchHttpClient.js.map