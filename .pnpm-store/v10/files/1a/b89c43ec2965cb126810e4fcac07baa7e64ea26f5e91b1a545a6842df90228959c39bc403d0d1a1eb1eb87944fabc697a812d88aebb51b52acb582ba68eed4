"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestPolicyFactoryPolicyName = exports.HttpPipelineLogLevel = void 0;
exports.createRequestPolicyFactoryPolicy = createRequestPolicyFactoryPolicy;
const util_js_1 = require("../util.js");
const response_js_1 = require("../response.js");
/**
 * An enum for compatibility with RequestPolicy
 */
var HttpPipelineLogLevel;
(function (HttpPipelineLogLevel) {
    HttpPipelineLogLevel[HttpPipelineLogLevel["ERROR"] = 1] = "ERROR";
    HttpPipelineLogLevel[HttpPipelineLogLevel["INFO"] = 3] = "INFO";
    HttpPipelineLogLevel[HttpPipelineLogLevel["OFF"] = 0] = "OFF";
    HttpPipelineLogLevel[HttpPipelineLogLevel["WARNING"] = 2] = "WARNING";
})(HttpPipelineLogLevel || (exports.HttpPipelineLogLevel = HttpPipelineLogLevel = {}));
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
exports.requestPolicyFactoryPolicyName = "RequestPolicyFactoryPolicy";
/**
 * A policy that wraps policies written for core-http.
 * @param factories - An array of `RequestPolicyFactory` objects from a core-http pipeline
 */
function createRequestPolicyFactoryPolicy(factories) {
    const orderedFactories = factories.slice().reverse();
    return {
        name: exports.requestPolicyFactoryPolicyName,
        async sendRequest(request, next) {
            let httpPipeline = {
                async sendRequest(httpRequest) {
                    const response = await next((0, util_js_1.toPipelineRequest)(httpRequest));
                    return (0, response_js_1.toCompatResponse)(response, { createProxy: true });
                },
            };
            for (const factory of orderedFactories) {
                httpPipeline = factory.create(httpPipeline, mockRequestPolicyOptions);
            }
            const webResourceLike = (0, util_js_1.toWebResourceLike)(request, { createProxy: true });
            const response = await httpPipeline.sendRequest(webResourceLike);
            return (0, response_js_1.toPipelineResponse)(response);
        },
    };
}
//# sourceMappingURL=requestPolicyFactoryPolicy.js.map