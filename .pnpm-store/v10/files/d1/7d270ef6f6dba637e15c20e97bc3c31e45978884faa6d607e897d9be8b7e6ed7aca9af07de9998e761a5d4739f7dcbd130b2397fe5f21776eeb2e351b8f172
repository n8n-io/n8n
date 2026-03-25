"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendRequest = sendRequest;
const restError_js_1 = require("../restError.js");
const httpHeaders_js_1 = require("../httpHeaders.js");
const pipelineRequest_js_1 = require("../pipelineRequest.js");
const clientHelpers_js_1 = require("./clientHelpers.js");
const typeGuards_js_1 = require("../util/typeGuards.js");
const multipart_js_1 = require("./multipart.js");
/**
 * Helper function to send request used by the client
 * @param method - method to use to send the request
 * @param url - url to send the request to
 * @param pipeline - pipeline with the policies to run when sending the request
 * @param options - request options
 * @param customHttpClient - a custom HttpClient to use when making the request
 * @returns returns and HttpResponse
 */
async function sendRequest(method, url, pipeline, options = {}, customHttpClient) {
    const httpClient = customHttpClient ?? (0, clientHelpers_js_1.getCachedDefaultHttpsClient)();
    const request = buildPipelineRequest(method, url, options);
    try {
        const response = await pipeline.sendRequest(httpClient, request);
        const headers = response.headers.toJSON();
        const stream = response.readableStreamBody ?? response.browserStreamBody;
        const parsedBody = options.responseAsStream || stream !== undefined ? undefined : getResponseBody(response);
        const body = stream ?? parsedBody;
        if (options?.onResponse) {
            options.onResponse({ ...response, request, rawHeaders: headers, parsedBody });
        }
        return {
            request,
            headers,
            status: `${response.status}`,
            body,
        };
    }
    catch (e) {
        if ((0, restError_js_1.isRestError)(e) && e.response && options.onResponse) {
            const { response } = e;
            const rawHeaders = response.headers.toJSON();
            // UNBRANDED DIFFERENCE: onResponse callback does not have a second __legacyError property
            options?.onResponse({ ...response, request, rawHeaders }, e);
        }
        throw e;
    }
}
/**
 * Function to determine the request content type
 * @param options - request options InternalRequestParameters
 * @returns returns the content-type
 */
function getRequestContentType(options = {}) {
    return (options.contentType ??
        options.headers?.["content-type"] ??
        getContentType(options.body));
}
/**
 * Function to determine the content-type of a body
 * this is used if an explicit content-type is not provided
 * @param body - body in the request
 * @returns returns the content-type
 */
function getContentType(body) {
    if (ArrayBuffer.isView(body)) {
        return "application/octet-stream";
    }
    if (typeof body === "string") {
        try {
            JSON.parse(body);
            return "application/json";
        }
        catch (error) {
            // If we fail to parse the body, it is not json
            return undefined;
        }
    }
    // By default return json
    return "application/json";
}
function buildPipelineRequest(method, url, options = {}) {
    const requestContentType = getRequestContentType(options);
    const { body, multipartBody } = getRequestBody(options.body, requestContentType);
    const hasContent = body !== undefined || multipartBody !== undefined;
    const headers = (0, httpHeaders_js_1.createHttpHeaders)({
        ...(options.headers ? options.headers : {}),
        accept: options.accept ?? options.headers?.accept ?? "application/json",
        ...(hasContent &&
            requestContentType && {
            "content-type": requestContentType,
        }),
    });
    return (0, pipelineRequest_js_1.createPipelineRequest)({
        url,
        method,
        body,
        multipartBody,
        headers,
        allowInsecureConnection: options.allowInsecureConnection,
        abortSignal: options.abortSignal,
        onUploadProgress: options.onUploadProgress,
        onDownloadProgress: options.onDownloadProgress,
        timeout: options.timeout,
        enableBrowserStreams: true,
        streamResponseStatusCodes: options.responseAsStream
            ? new Set([Number.POSITIVE_INFINITY])
            : undefined,
    });
}
/**
 * Prepares the body before sending the request
 */
function getRequestBody(body, contentType = "") {
    if (body === undefined) {
        return { body: undefined };
    }
    if (typeof FormData !== "undefined" && body instanceof FormData) {
        return { body };
    }
    if ((0, typeGuards_js_1.isReadableStream)(body)) {
        return { body };
    }
    if (ArrayBuffer.isView(body)) {
        return { body: body instanceof Uint8Array ? body : JSON.stringify(body) };
    }
    const firstType = contentType.split(";")[0];
    switch (firstType) {
        case "application/json":
            return { body: JSON.stringify(body) };
        case "multipart/form-data":
            if (Array.isArray(body)) {
                return { multipartBody: (0, multipart_js_1.buildMultipartBody)(body) };
            }
            return { body: JSON.stringify(body) };
        case "text/plain":
            return { body: String(body) };
        default:
            if (typeof body === "string") {
                return { body };
            }
            return { body: JSON.stringify(body) };
    }
}
/**
 * Prepares the response body
 */
function getResponseBody(response) {
    // Set the default response type
    const contentType = response.headers.get("content-type") ?? "";
    const firstType = contentType.split(";")[0];
    const bodyToParse = response.bodyAsText ?? "";
    if (firstType === "text/plain") {
        return String(bodyToParse);
    }
    // Default to "application/json" and fallback to string;
    try {
        return bodyToParse ? JSON.parse(bodyToParse) : undefined;
    }
    catch (error) {
        // If we were supposed to get a JSON object and failed to
        // parse, throw a parse error
        if (firstType === "application/json") {
            throw createParseError(response, error);
        }
        // We are not sure how to handle the response so we return it as
        // plain text.
        return String(bodyToParse);
    }
}
function createParseError(response, err) {
    const msg = `Error "${err}" occurred while parsing the response body - ${response.bodyAsText}.`;
    const errCode = err.code ?? restError_js_1.RestError.PARSE_ERROR;
    return new restError_js_1.RestError(msg, {
        code: errCode,
        statusCode: response.status,
        request: response.request,
        response: response,
    });
}
//# sourceMappingURL=sendRequest.js.map