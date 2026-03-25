// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { createHttpHeaders } from "@azure/core-rest-pipeline";
import { toHttpHeadersLike, toPipelineRequest, toWebResourceLike, } from "./util.js";
const originalResponse = Symbol("Original FullOperationResponse");
/**
 * A helper to convert response objects from the new pipeline back to the old one.
 * @param response - A response object from core-client.
 * @returns A response compatible with `HttpOperationResponse` from core-http.
 */
export function toCompatResponse(response, options) {
    let request = toWebResourceLike(response.request);
    let headers = toHttpHeadersLike(response.headers);
    if (options === null || options === void 0 ? void 0 : options.createProxy) {
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
        return Object.assign(Object.assign({}, response), { request,
            headers });
    }
}
/**
 * A helper to convert back to a PipelineResponse
 * @param compatResponse - A response compatible with `HttpOperationResponse` from core-http.
 */
export function toPipelineResponse(compatResponse) {
    const extendedCompatResponse = compatResponse;
    const response = extendedCompatResponse[originalResponse];
    const headers = createHttpHeaders(compatResponse.headers.toJson({ preserveCase: true }));
    if (response) {
        response.headers = headers;
        return response;
    }
    else {
        return Object.assign(Object.assign({}, compatResponse), { headers, request: toPipelineRequest(compatResponse.request) });
    }
}
//# sourceMappingURL=response.js.map