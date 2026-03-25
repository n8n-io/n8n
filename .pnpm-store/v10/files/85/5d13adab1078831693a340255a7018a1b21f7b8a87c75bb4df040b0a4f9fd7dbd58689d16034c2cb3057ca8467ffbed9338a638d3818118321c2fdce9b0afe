// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export const disableKeepAlivePolicyName = "DisableKeepAlivePolicy";
export function createDisableKeepAlivePolicy() {
    return {
        name: disableKeepAlivePolicyName,
        async sendRequest(request, next) {
            request.disableKeepAlive = true;
            return next(request);
        },
    };
}
/**
 * @internal
 */
export function pipelineContainsDisableKeepAlivePolicy(pipeline) {
    return pipeline.getOrderedPolicies().some((policy) => policy.name === disableKeepAlivePolicyName);
}
//# sourceMappingURL=disableKeepAlivePolicy.js.map