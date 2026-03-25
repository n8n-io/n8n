"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuthenticationPolicyName = void 0;
exports.apiKeyAuthenticationPolicy = apiKeyAuthenticationPolicy;
const checkInsecureConnection_js_1 = require("./checkInsecureConnection.js");
/**
 * Name of the API Key Authentication Policy
 */
exports.apiKeyAuthenticationPolicyName = "apiKeyAuthenticationPolicy";
/**
 * Gets a pipeline policy that adds API key authentication to requests
 */
function apiKeyAuthenticationPolicy(options) {
    return {
        name: exports.apiKeyAuthenticationPolicyName,
        async sendRequest(request, next) {
            // Ensure allowInsecureConnection is explicitly set when sending request to non-https URLs
            (0, checkInsecureConnection_js_1.ensureSecureConnection)(request, options);
            const scheme = (request.authSchemes ?? options.authSchemes)?.find((x) => x.kind === "apiKey");
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