// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
/**
 * The programmatic identifier of the bearerTokenAuthenticationPolicy.
 */
export const keyCredentialAuthenticationPolicyName = "keyCredentialAuthenticationPolicy";
export function keyCredentialAuthenticationPolicy(credential, apiKeyHeaderName) {
    return {
        name: keyCredentialAuthenticationPolicyName,
        async sendRequest(request, next) {
            request.headers.set(apiKeyHeaderName, credential.key);
            return next(request);
        },
    };
}
//# sourceMappingURL=keyCredentialAuthenticationPolicy.js.map