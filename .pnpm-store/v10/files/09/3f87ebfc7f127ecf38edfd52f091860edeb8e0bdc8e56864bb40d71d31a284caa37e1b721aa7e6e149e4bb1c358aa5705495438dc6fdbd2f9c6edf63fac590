// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { toPipelineRequest, toWebResourceLike } from "../util.js";
import { toCompatResponse, toPipelineResponse } from "../response.js";
/**
 * An enum for compatibility with RequestPolicy
 */
export var HttpPipelineLogLevel;
(function (HttpPipelineLogLevel) {
    HttpPipelineLogLevel[HttpPipelineLogLevel["ERROR"] = 1] = "ERROR";
    HttpPipelineLogLevel[HttpPipelineLogLevel["INFO"] = 3] = "INFO";
    HttpPipelineLogLevel[HttpPipelineLogLevel["OFF"] = 0] = "OFF";
    HttpPipelineLogLevel[HttpPipelineLogLevel["WARNING"] = 2] = "WARNING";
})(HttpPipelineLogLevel || (HttpPipelineLogLevel = {}));
const mockRequestPolicyOptions = {
    log(_logLevel, _message) {
        /* do nothing */
    },
    shouldLog(_logLevel) {
        return false;
    },
};
/**
 * The name of the RequestPolicyFactoryPolicy
 */
export const requestPolicyFactoryPolicyName = "RequestPolicyFactoryPolicy";
/**
 * A policy that wraps policies written for core-http.
 * @param factories - An array of `RequestPolicyFactory` objects from a core-http pipeline
 */
export function createRequestPolicyFactoryPolicy(factories) {
    const orderedFactories = factories.slice().reverse();
    return {
        name: requestPolicyFactoryPolicyName,
        async sendRequest(request, next) {
            let httpPipeline = {
                async sendRequest(httpRequest) {
                    const response = await next(toPipelineRequest(httpRequest));
                    return toCompatResponse(response, { createProxy: true });
                },
            };
            for (const factory of orderedFactories) {
                httpPipeline = factory.create(httpPipeline, mockRequestPolicyOptions);
            }
            const webResourceLike = toWebResourceLike(request, { createProxy: true });
            const response = await httpPipeline.sendRequest(webResourceLike);
            return toPipelineResponse(response);
        },
    };
}
//# sourceMappingURL=requestPolicyFactoryPolicy.js.map