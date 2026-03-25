// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { ensureSecureConnection } from "./checkInsecureConnection.js";
/**
 * Name of the API Key Authentication Policy
 */
export const apiKeyAuthenticationPolicyName = "apiKeyAuthenticationPolicy";
/**
 * Gets a pipeline policy that adds API key authentication to requests
 */
export function apiKeyAuthenticationPolicy(options) {
    return {
        name: apiKeyAuthenticationPolicyName,
        async sendRequest(request, next) {
            var _a, _b;
            // Ensure allowInsecureConnection is explicitly set when sending request to non-https URLs
            ensureSecureConnection(request, options);
            const scheme = (_b = ((_a = request.authSchemes) !== null && _a !== void 0 ? _a : options.authSchemes)) === null || _b === void 0 ? void 0 : _b.find((x) => x.kind === "apiKey");
            // Skip adding authentication header if no API key authentication scheme is found
            if (!scheme) {
                return next(request);
            }
            if (scheme.apiKeyLocation !== "header") {
                throw new Error(`Unsupported API key location: ${scheme.apiKeyLocation}`);
            }
            request.headers.set(scheme.name, options.credential.key);
            return next(request);
        },
    };
}
//# sourceMappingURL=apiKeyAuthenticationPolicy.js.map