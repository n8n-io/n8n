"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.pipelineContainsDisableKeepAlivePolicy = exports.createDisableKeepAlivePolicy = exports.disableKeepAlivePolicyName = void 0;
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
exports.createDisableKeepAlivePolicy = createDisableKeepAlivePolicy;
/**
 * @internal
 */
function pipelineContainsDisableKeepAlivePolicy(pipeline) {
    return pipeline.getOrderedPolicies().some((policy) => policy.name === exports.disableKeepAlivePolicyName);
}
exports.pipelineContainsDisableKeepAlivePolicy = pipelineContainsDisableKeepAlivePolicy;
//# sourceMappingURL=disableKeepAlivePolicy.js.map