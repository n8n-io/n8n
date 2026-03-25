"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.basicAuthenticationPolicyName = void 0;
exports.basicAuthenticationPolicy = basicAuthenticationPolicy;
const bytesEncoding_js_1 = require("../../util/bytesEncoding.js");
const checkInsecureConnection_js_1 = require("./checkInsecureConnection.js");
/**
 * Name of the Basic Authentication Policy
 */
exports.basicAuthenticationPolicyName = "bearerAuthenticationPolicy";
/**
 * Gets a pipeline policy that adds basic authentication to requests
 */
function basicAuthenticationPolicy(options) {
    return {
        name: exports.basicAuthenticationPolicyName,
        async sendRequest(request, next) {
            var _a, _b;
            // Ensure allowInsecureConnection is explicitly set when sending request to non-https URLs
            (0, checkInsecureConnection_js_1.ensureSecureConnection)(request, options);
            const scheme = (_b = ((_a = request.authSchemes) !== null && _a !== void 0 ? _a : options.authSchemes)) === null || _b === void 0 ? void 0 : _b.find((x) => x.kind === "http" && x.scheme === "basic");
            // Skip adding authentication header if no basic authentication scheme is found
            if (!scheme) {
                return next(request);
            }
            const { username, password } = options.credential;
            const headerValue = (0, bytesEncoding_js_1.uint8ArrayToString)((0, bytesEncoding_js_1.stringToUint8Array)(`${username}:${password}`, "utf-8"), "base64");
            request.headers.set("Authorization", `Basic ${headerValue}`);
            return next(request);
        },
    };
}
//# sourceMappingURL=basicAuthenticationPolicy.js.map