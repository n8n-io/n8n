"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.oauth2AuthenticationPolicyName = void 0;
exports.oauth2AuthenticationPolicy = oauth2AuthenticationPolicy;
const checkInsecureConnection_js_1 = require("./checkInsecureConnection.js");
/**
 * Name of the OAuth2 Authentication Policy
 */
exports.oauth2AuthenticationPolicyName = "oauth2AuthenticationPolicy";
/**
 * Gets a pipeline policy that adds authorization header from OAuth2 schemes
 */
function oauth2AuthenticationPolicy(options) {
    return {
        name: exports.oauth2AuthenticationPolicyName,
        async sendRequest(request, next) {
            // Ensure allowInsecureConnection is explicitly set when sending request to non-https URLs
            (0, checkInsecureConnection_js_1.ensureSecureConnection)(request, options);
            const scheme = (request.authSchemes ?? options.authSchemes)?.find((x) => x.kind === "oauth2");
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