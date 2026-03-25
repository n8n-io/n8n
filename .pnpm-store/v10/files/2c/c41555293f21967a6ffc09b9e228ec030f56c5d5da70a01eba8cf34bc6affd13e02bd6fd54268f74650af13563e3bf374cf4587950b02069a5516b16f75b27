"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.decompressResponsePolicyName = void 0;
exports.decompressResponsePolicy = decompressResponsePolicy;
/**
 * The programmatic identifier of the decompressResponsePolicy.
 */
exports.decompressResponsePolicyName = "decompressResponsePolicy";
/**
 * A policy to enable response decompression according to Accept-Encoding header
 * https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Accept-Encoding
 */
function decompressResponsePolicy() {
    return {
        name: exports.decompressResponsePolicyName,
        async sendRequest(request, next) {
            // HEAD requests have no body
            if (request.method !== "HEAD") {
                request.headers.set("Accept-Encoding", "gzip,deflate");
            }
            return next(request);
        },
    };
}
//# sourceMappingURL=decompressResponsePolicy.js.map