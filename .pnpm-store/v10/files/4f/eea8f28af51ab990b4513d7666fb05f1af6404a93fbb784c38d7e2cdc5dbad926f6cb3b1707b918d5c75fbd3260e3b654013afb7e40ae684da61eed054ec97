"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.keyCredentialAuthenticationPolicyName = void 0;
exports.keyCredentialAuthenticationPolicy = keyCredentialAuthenticationPolicy;
/**
 * The programmatic identifier of the bearerTokenAuthenticationPolicy.
 */
exports.keyCredentialAuthenticationPolicyName = "keyCredentialAuthenticationPolicy";
function keyCredentialAuthenticationPolicy(credential, apiKeyHeaderName) {
    return {
        name: exports.keyCredentialAuthenticationPolicyName,
        async sendRequest(request, next) {
            request.headers.set(apiKeyHeaderName, credential.key);
            return next(request);
        },
    };
}
//# sourceMappingURL=keyCredentialAuthenticationPolicy.js.map