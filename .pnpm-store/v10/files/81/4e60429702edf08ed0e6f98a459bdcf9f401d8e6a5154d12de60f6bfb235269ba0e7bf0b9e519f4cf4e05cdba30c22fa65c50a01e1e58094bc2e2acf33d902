// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { ensureSecureConnection } from "./checkInsecureConnection.js";
/**
 * Name of the Bearer Authentication Policy
 */
export const bearerAuthenticationPolicyName = "bearerAuthenticationPolicy";
/**
 * Gets a pipeline policy that adds bearer token authentication to requests
 */
export function bearerAuthenticationPolicy(options) {
    return {
        name: bearerAuthenticationPolicyName,
        async sendRequest(request, next) {
            // Ensure allowInsecureConnection is explicitly set when sending request to non-https URLs
            ensureSecureConnection(request, options);
            const scheme = (request.authSchemes ?? options.authSchemes)?.find((x) => x.kind === "http" && x.scheme === "bearer");
            // Skip adding authentication header if no bearer authentication scheme is found
            if (!scheme) {
                return next(request);
            }
            const token = await options.credential.getBearerToken({
                abortSignal: request.abortSignal,
            });
            request.headers.set("Authorization", `Bearer ${token}`);
            return next(request);
        },
    };
}
//# sourceMappingURL=bearerAuthenticationPolicy.js.map