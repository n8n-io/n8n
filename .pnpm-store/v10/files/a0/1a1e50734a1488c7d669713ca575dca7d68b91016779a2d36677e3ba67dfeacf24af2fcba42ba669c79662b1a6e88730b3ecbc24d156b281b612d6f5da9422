"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.disableKeepAlivePolicyName = void 0;
exports.createDisableKeepAlivePolicy = createDisableKeepAlivePolicy;
exports.pipelineContainsDisableKeepAlivePolicy = pipelineContainsDisableKeepAlivePolicy;
exports.disableKeepAlivePolicyName = "DisableKeepAlivePolicy";
function createDisableKeepAlivePolicy() {
    return {
        name: exports.disableKeepAlivePolicyName,
        async sendRequest(request, next) {
            request.disableKeepAlive = true;
            return next(request);
        },
    };
}
/**
 * @internal
 */
function pipelineContainsDisableKeepAlivePolicy(pipeline) {
    return pipeline.getOrderedPolicies().some((policy) => policy.name === exports.disableKeepAlivePolicyName);
}
//# sourceMappingURL=disableKeepAlivePolicy.js.map