"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.tlsPolicyName = void 0;
exports.tlsPolicy = tlsPolicy;
/**
 * Name of the TLS Policy
 */
exports.tlsPolicyName = "tlsPolicy";
/**
 * Gets a pipeline policy that adds the client certificate to the HttpClient agent for authentication.
 */
function tlsPolicy(tlsSettings) {
    return {
        name: exports.tlsPolicyName,
        sendRequest: async (req, next) => {
            // Users may define a request tlsSettings, honor those over the client level one
            if (!req.tlsSettings) {
                req.tlsSettings = tlsSettings;
            }
            return next(req);
        },
    };
}
//# sourceMappingURL=tlsPolicy.js.map