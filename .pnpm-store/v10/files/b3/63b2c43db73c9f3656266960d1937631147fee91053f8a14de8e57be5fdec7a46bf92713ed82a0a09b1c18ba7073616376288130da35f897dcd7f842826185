// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createDefaultPipeline } from "./clientHelpers.js";
import { sendRequest } from "./sendRequest.js";
import { buildRequestUrl } from "./urlHelpers.js";
import { isNodeLike } from "../util/checkEnvironment.js";
/**
 * Creates a client with a default pipeline
 * @param endpoint - Base endpoint for the client
 * @param credentials - Credentials to authenticate the requests
 * @param options - Client options
 */
export function getClient(endpoint, clientOptions = {}) {
    const pipeline = clientOptions.pipeline ?? createDefaultPipeline(clientOptions);
    if (clientOptions.additionalPolicies?.length) {
        for (const { policy, position } of clientOptions.additionalPolicies) {
            // Sign happens after Retry and is commonly needed to occur
            // before policies that intercept post-retry.
            const afterPhase = position === "perRetry" ? "Sign" : undefined;
            pipeline.addPolicy(policy, {
                afterPhase,
            });
        }
    }
    const { allowInsecureConnection, httpClient } = clientOptions;
    const endpointUrl = clientOptions.endpoint ?? endpoint;
    const client = (path, ...args) => {
        const getUrl = (requestOptions) => buildRequestUrl(endpointUrl, path, args, { allowInsecureConnection, ...requestOptions });
        return {
            get: (requestOptions = {}) => {
                return buildOperation("GET", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient);
            },
            post: (requestOptions = {}) => {
                return buildOperation("POST", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient);
            },
            put: (requestOptions = {}) => {
                return buildOperation("PUT", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient);
            },
            patch: (requestOptions = {}) => {
                return buildOperation("PATCH", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient);
            },
            delete: (requestOptions = {}) => {
                return buildOperation("DELETE", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient);
            },
            head: (requestOptions = {}) => {
                return buildOperation("HEAD", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient);
            },
            options: (requestOptions = {}) => {
                return buildOperation("OPTIONS", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient);
            },
            trace: (requestOptions = {}) => {
                return buildOperation("TRACE", getUrl(requestOptions), pipeline, requestOptions, allowInsecureConnection, httpClient);
            },
        };
    };
    return {
        path: client,
        pathUnchecked: client,
        pipeline,
    };
}
function buildOperation(method, url, pipeline, options, allowInsecureConnection, httpClient) {
    allowInsecureConnection = options.allowInsecureConnection ?? allowInsecureConnection;
    return {
        then: function (onFulfilled, onrejected) {
            return sendRequest(method, url, pipeline, { ...options, allowInsecureConnection }, httpClient).then(onFulfilled, onrejected);
        },
        async asBrowserStream() {
            if (isNodeLike) {
                throw new Error("`asBrowserStream` is supported only in the browser environment. Use `asNodeStream` instead to obtain the response body stream. If you require a Web stream of the response in Node, consider using `Readable.toWeb` on the result of `asNodeStream`.");
            }
            else {
                return sendRequest(method, url, pipeline, { ...options, allowInsecureConnection, responseAsStream: true }, httpClient);
            }
        },
        async asNodeStream() {
            if (isNodeLike) {
                return sendRequest(method, url, pipeline, { ...options, allowInsecureConnection, responseAsStream: true }, httpClient);
            }
            else {
                throw new Error("`isNodeStream` is not supported in the browser environment. Use `asBrowserStream` to obtain the response body stream.");
            }
        },
    };
}
//# sourceMappingURL=getClient.js.map