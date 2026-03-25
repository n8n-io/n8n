// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { ensureSecureConnection } from "./checkInsecureConnection.js";
/**
 * Name of the OAuth2 Authentication Policy
 */
export const oauth2AuthenticationPolicyName = "oauth2AuthenticationPolicy";
/**
 * Gets a pipeline policy that adds authorization header from OAuth2 schemes
 */
export function oauth2AuthenticationPolicy(options) {
    return {
        name: oauth2AuthenticationPolicyName,
        async sendRequest(request, next) {
            var _a, _b;
            // Ensure allowInsecureConnection is explicitly set when sending request to non-https URLs
            ensureSecureConnection(request, options);
            const scheme = (_b = ((_a = request.authSchemes) !== null && _a !== void 0 ? _a : options.authSchemes)) === null || _b === void 0 ? void 0 : _b.find((x) => x.kind === "oauth2");
            // Skip adding authentication header if no OAuth2 authentication scheme is found
            if (!scheme) {
                return next(request);
            }
            const token = await options.credential.getOAuth2Token(scheme.flows, {
                abortSignal: request.abortSignal,
            });
            request.headers.set("Authorization", `Bearer ${token}`);
            return next(request);
        },
    };
}
//# sourceMappingURL=oauth2AuthenticationPolicy.js.map