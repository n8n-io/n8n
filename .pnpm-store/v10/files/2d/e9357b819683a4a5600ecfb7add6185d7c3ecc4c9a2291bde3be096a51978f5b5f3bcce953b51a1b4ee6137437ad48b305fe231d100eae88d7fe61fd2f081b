// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
export const disbaleKeepAlivePolicyName = "DisableKeepAlivePolicy";
export function createDisableKeepAlivePolicy() {
    return {
        name: disbaleKeepAlivePolicyName,
        async sendRequest(request, next) {
            request.disableKeepAlive = true;
            return next(request);
        },
    };
}
//# sourceMappingURL=disableKeepAlivePolicy.js.map