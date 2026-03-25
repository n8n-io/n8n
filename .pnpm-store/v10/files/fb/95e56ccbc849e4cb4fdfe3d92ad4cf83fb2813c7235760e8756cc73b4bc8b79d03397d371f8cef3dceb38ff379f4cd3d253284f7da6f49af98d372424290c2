'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var coreRestPipeline = require('@azure/core-rest-pipeline');
var coreClient = require('@azure/core-client');

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
const disbaleKeepAlivePolicyName = "DisableKeepAlivePolicy";
function createDisableKeepAlivePolicy() {
    return {
        name: disbaleKeepAlivePolicyName,
        async sendRequest(request, next) {
            request.disableKeepAlive = true;
            return next(request);
        },
    };
}

// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
function toWebResourceLike(request) {
    return {
        url: request.url,
        method: request.method,
        headers: toHttpHeaderLike(request.headers),
        withCredentials: request.withCredentials,
        timeout: request.timeout,
        requestId: request.headers.get("x-ms-client-request-id") || "",
    };
}
function toHttpHeaderLike(headers) {
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
class HttpHeaders {
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

// Copyright (c) Microsoft Corporation.
/**
 * Client to provide compatability between core V1 & V2.
 */
class ExtendedServiceClient extends coreClient.ServiceClient {
    constructor(options) {
        var _a, _b;
        super(options);
        if (((_a = options.keepAliveOptions) === null || _a === void 0 ? void 0 : _a.enable) === false) {
            this.pipeline.addPolicy(createDisableKeepAlivePolicy());
        }
        if (((_b = options.redirectOptions) === null || _b === void 0 ? void 0 : _b.handleRedirects) === false) {
            this.pipeline.removePolicy({
                name: coreRestPipeline.redirectPolicyName,
            });
        }
    }
    /**
     * Compatible send operation request function.
     *
     * @param operationArguments - Operation arguments
     * @param operationSpec - Operation Spec
     * @returns
     */
    async sendOperationRequest(operationArguments, operationSpec) {
        var _a;
        const userProvidedCallBack = (_a = operationArguments === null || operationArguments === void 0 ? void 0 : operationArguments.options) === null || _a === void 0 ? void 0 : _a.onResponse;
        let lastResponse;
        function onResponse(rawResponse, flatResponse, error) {
            lastResponse = rawResponse;
            if (userProvidedCallBack) {
                userProvidedCallBack(rawResponse, flatResponse, error);
            }
        }
        operationArguments.options = Object.assign(Object.assign({}, operationArguments.options), { onResponse });
        const result = await super.sendOperationRequest(operationArguments, operationSpec);
        if (lastResponse) {
            Object.defineProperty(result, "_response", {
                value: Object.assign(Object.assign({}, lastResponse), { request: toWebResourceLike(lastResponse.request), headers: toHttpHeaderLike(lastResponse.headers) }),
            });
        }
        return result;
    }
}

exports.ExtendedServiceClient = ExtendedServiceClient;
exports.disbaleKeepAlivePolicyName = disbaleKeepAlivePolicyName;
//# sourceMappingURL=index.js.map
