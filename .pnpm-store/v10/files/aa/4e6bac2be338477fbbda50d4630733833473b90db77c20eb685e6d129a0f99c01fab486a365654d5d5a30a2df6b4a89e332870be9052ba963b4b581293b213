// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { stringToUint8Array, uint8ArrayToString } from "../../util/bytesEncoding.js";
import { ensureSecureConnection } from "./checkInsecureConnection.js";
/**
 * Name of the Basic Authentication Policy
 */
export const basicAuthenticationPolicyName = "bearerAuthenticationPolicy";
/**
 * Gets a pipeline policy that adds basic authentication to requests
 */
export function basicAuthenticationPolicy(options) {
    return {
        name: basicAuthenticationPolicyName,
        async sendRequest(request, next) {
            // Ensure allowInsecureConnection is explicitly set when sending request to non-https URLs
            ensureSecureConnection(request, options);
            const scheme = (request.authSchemes ?? options.authSchemes)?.find((x) => x.kind === "http" && x.scheme === "basic");
            // Skip adding authentication header if no basic authentication scheme is found
            if (!scheme) {
                return next(request);
            }
            const { username, password } = options.credential;
            const headerValue = uint8ArrayToString(stringToUint8Array(`${username}:${password}`, "utf-8"), "base64");
            request.headers.set("Authorization", `Basic ${headerValue}`);
            return next(request);
        },
    };
}
//# sourceMappingURL=basicAuthenticationPolicy.js.map