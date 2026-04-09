// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createHttpHeaders, createPipelineRequest } from "@azure/core-rest-pipeline";
// We use a custom symbol to cache a reference to the original request without
// exposing it on the public interface.
const originalRequestSymbol = Symbol("Original PipelineRequest");
// Symbol.for() will return the same symbol if it's already been created
// This particular one is used in core-client to handle the case of when a request is
// cloned but we need to retrieve the OperationSpec and OperationArguments from the
// original request.
const originalClientRequestSymbol = Symbol.for("@azure/core-client original request");
export function toPipelineRequest(webResource, options = {}) {
    const compatWebResource = webResource;
    const request = compatWebResource[originalRequestSymbol];
    const headers = createHttpHeaders(webResource.headers.toJson({ preserveCase: true }));
    if (request) {
        request.headers = headers;
        return request;
    }
    else {
        const newRequest = createPipelineRequest({
            url: webResource.url,
            method: webResource.method,
            headers,
            withCredentials: webResource.withCredentials,
            timeout: webResource.timeout,
            requestId: webResource.requestId,
            abortSignal: webResource.abortSignal,
            body: webResource.body,
            formData: webResource.formData,
            disableKeepAlive: !!webResource.keepAlive,
            onDownloadProgress: webResource.onDownloadProgress,
            onUploadProgress: webResource.onUploadProgress,
            proxySettings: webResource.proxySettings,
            streamResponseStatusCodes: webResource.streamResponseStatusCodes,
            agent: webResource.agent,
            requestOverrides: webResource.requestOverrides,
        });
        if (options.originalRequest) {
            newRequest[originalClientRequestSymbol] =
                options.originalRequest;
        }
        return newRequest;
    }
}
export function toWebResourceLike(request, options) {
    const originalRequest = options?.originalRequest ?? request;
    const webResource = {
        url: request.url,
        method: request.method,
        headers: toHttpHeadersLike(request.headers),
        withCredentials: request.withCredentials,
        timeout: request.timeout,
        requestId: request.headers.get("x-ms-client-request-id") || request.requestId,
        abortSignal: request.abortSignal,
        body: request.body,
        formData: request.formData,
        keepAlive: !!request.disableKeepAlive,
        onDownloadProgress: request.onDownloadProgress,
        onUploadProgress: request.onUploadProgress,
        proxySettings: request.proxySettings,
        streamResponseStatusCodes: request.streamResponseStatusCodes,
        agent: request.agent,
        requestOverrides: request.requestOverrides,
        clone() {
            throw new Error("Cannot clone a non-proxied WebResourceLike");
        },
        prepare() {
            throw new Error("WebResourceLike.prepare() is not supported by @azure/core-http-compat");
        },
        validateRequestProperties() {
            /** do nothing */
        },
    };
    if (options?.createProxy) {
        return new Proxy(webResource, {
            get(target, prop, receiver) {
                if (prop === originalRequestSymbol) {
                    return request;
                }
                else if (prop === "clone") {
                    return () => {
                        return toWebResourceLike(toPipelineRequest(webResource, { originalRequest }), {
                            createProxy: true,
                            originalRequest,
                        });
                    };
                }
                return Reflect.get(target, prop, receiver);
            },
            set(target, prop, value, receiver) {
                if (prop === "keepAlive") {
                    request.disableKeepAlive = !value;
                }
                const passThroughProps = [
                    "url",
                    "method",
                    "withCredentials",
                    "timeout",
                    "requestId",
                    "abortSignal",
                    "body",
                    "formData",
                    "onDownloadProgress",
                    "onUploadProgress",
                    "proxySettings",
                    "streamResponseStatusCodes",
                    "agent",
                    "requestOverrides",
                ];
                if (typeof prop === "string" && passThroughProps.includes(prop)) {
                    request[prop] = value;
                }
                return Reflect.set(target, prop, value, receiver);
            },
        });
    }
    else {
        return webResource;
    }
}
/**
 * Converts HttpHeaders from core-rest-pipeline to look like
 * HttpHeaders from core-http.
 * @param headers - HttpHeaders from core-rest-pipeline
 * @returns HttpHeaders as they looked in core-http
 */
export function toHttpHeadersLike(headers) {
    return new HttpHeaders(headers.toJSON({ preserveCase: true }));
}
/**
 * A collection of HttpHeaders that can be sent with a HTTP request.
 */
function getHeaderKey(headerName) {
    return headerName.toLowerCase();
}
/**
 * A collection of HTTP header key/value pairs.
 */
export class HttpHeaders {
    _headersMap;
    constructor(rawHeaders) {
        this._headersMap = {};
        if (rawHeaders) {
            for (const headerName in rawHeaders) {
                this.set(headerName, rawHeaders[headerName]);
            }
        }
    }
    /**
     * Set a header in this collection with the provided name and value. The name is
     * case-insensitive.
     * @param headerName - The name of the header to set. This value is case-insensitive.
     * @param headerValue - The value of the header to set.
     */
    set(headerName, headerValue) {
        this._headersMap[getHeaderKey(headerName)] = {
            name: headerName,
            value: headerValue.toString(),
        };
    }
    /**
     * Get the header value for the provided header name, or undefined if no header exists in this
     * collection with the provided name.
     * @param headerName - The name of the header.
     */
    get(headerName) {
        const header = this._headersMap[getHeaderKey(headerName)];
        return !header ? undefined : header.value;
    }
    /**
     * Get whether or not this header collection contains a header entry for the provided header name.
     */
    contains(headerName) {
        return !!this._headersMap[getHeaderKey(headerName)];
    }
    /**
     * Remove the header with the provided headerName. Return whether or not the header existed and
     * was removed.
     * @param headerName - The name of the header to remove.
     */
    remove(headerName) {
        const result = this.contains(headerName);
        delete this._headersMap[getHeaderKey(headerName)];
        return result;
    }
    /**
     * Get the headers that are contained this collection as an object.
     */
    rawHeaders() {
        return this.toJson({ preserveCase: true });
    }
    /**
     * Get the headers that are contained in this collection as an array.
     */
    headersArray() {
        const headers = [];
        for (const headerKey in this._headersMap) {
            headers.push(this._headersMap[headerKey]);
        }
        return headers;
    }
    /**
     * Get the header names that are contained in this collection.
     */
    headerNames() {
        const headerNames = [];
        const headers = this.headersArray();
        for (let i = 0; i < headers.length; ++i) {
            headerNames.push(headers[i].name);
        }
        return headerNames;
    }
    /**
     * Get the header values that are contained in this collection.
     */
    headerValues() {
        const headerValues = [];
        const headers = this.headersArray();
        for (let i = 0; i < headers.length; ++i) {
            headerValues.push(headers[i].value);
        }
        return headerValues;
    }
    /**
     * Get the JSON object representation of this HTTP header collection.
     */
    toJson(options = {}) {
        const result = {};
        if (options.preserveCase) {
            for (const headerKey in this._headersMap) {
                const header = this._headersMap[headerKey];
                result[header.name] = header.value;
            }
        }
        else {
            for (const headerKey in this._headersMap) {
                const header = this._headersMap[headerKey];
                result[getHeaderKey(header.name)] = header.value;
            }
        }
        return result;
    }
    /**
     * Get the string representation of this HTTP header collection.
     */
    toString() {
        return JSON.stringify(this.toJson({ preserveCase: true }));
    }
    /**
     * Create a deep clone/copy of this HttpHeaders collection.
     */
    clone() {
        const resultPreservingCasing = {};
        for (const headerKey in this._headersMap) {
            const header = this._headersMap[headerKey];
            resultPreservingCasing[header.name] = header.value;
        }
        return new HttpHeaders(resultPreservingCasing);
    }
}
//# sourceMappingURL=util.js.map