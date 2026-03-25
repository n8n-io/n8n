"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRetryPolicyName = void 0;
exports.defaultRetryPolicy = defaultRetryPolicy;
const policies_1 = require("@typespec/ts-http-runtime/internal/policies");
/**
 * Name of the {@link defaultRetryPolicy}
 */
exports.defaultRetryPolicyName = policies_1.defaultRetryPolicyName;
/**
 * A policy that retries according to three strategies:
 * - When the server sends a 429 response with a Retry-After header.
 * - When there are errors in the underlying transport layer (e.g. DNS lookup failures).
 * - Or otherwise if the outgoing request fails, it will retry with an exponentially increasing delay.
 */
function defaultRetryPolicy(options = {}) {
    return (0, policies_1.defaultRetryPolicy)(options);
}
//# sourceMappingURL=defaultRetryPolicy.js.map