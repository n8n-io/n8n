"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCompatResponse = toCompatResponse;
exports.toPipelineResponse = toPipelineResponse;
const core_rest_pipeline_1 = require("@azure/core-rest-pipeline");
const util_js_1 = require("./util.js");
const originalResponse = Symbol("Original FullOperationResponse");
/**
 * A helper to convert response objects from the new pipeline back to the old one.
 * @param response - A response object from core-client.
 * @returns A response compatible with `HttpOperationResponse` from core-http.
 */
function toCompatResponse(response, options) {
    let request = (0, util_js_1.toWebResourceLike)(response.request);
    let headers = (0, util_js_1.toHttpHeadersLike)(response.headers);
    if (options?.createProxy) {
        return new Proxy(response, {
            get(target, prop, receiver) {
                if (prop === "headers") {
                    return headers;
                }
                else if (prop === "request") {
                    return request;
                }
                else if (prop === originalResponse) {
                    return response;
                }
                return Reflect.get(target, prop, receiver);
            },
            set(target, prop, value, receiver) {
                if (prop === "headers") {
                    headers = value;
                }
                else if (prop === "request") {
                    request = value;
                }
                return Reflect.set(target, prop, value, receiver);
            },
        });
    }
    else {
        return {
            ...response,
            request,
            headers,
        };
    }
}
/**
 * A helper to convert back to a PipelineResponse
 * @param compatResponse - A response compatible with `HttpOperationResponse` from core-http.
 */
function toPipelineResponse(compatResponse) {
    const extendedCompatResponse = compatResponse;
    const response = extendedCompatResponse[originalResponse];
    const headers = (0, core_rest_pipeline_1.createHttpHeaders)(compatResponse.headers.toJson({ preserveCase: true }));
    if (response) {
        response.headers = headers;
        return response;
    }
    else {
        return {
            ...compatResponse,
            headers,
            request: (0, util_js_1.toPipelineRequest)(compatResponse.request),
        };
    }
}
//# sourceMappingURL=response.js.map