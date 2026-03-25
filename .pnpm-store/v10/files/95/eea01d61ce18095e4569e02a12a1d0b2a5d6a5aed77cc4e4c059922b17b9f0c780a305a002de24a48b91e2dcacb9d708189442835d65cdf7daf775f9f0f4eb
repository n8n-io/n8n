"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemErrorRetryPolicyName = void 0;
exports.systemErrorRetryPolicy = systemErrorRetryPolicy;
const policies_1 = require("@typespec/ts-http-runtime/internal/policies");
/**
 * Name of the {@link systemErrorRetryPolicy}
 */
exports.systemErrorRetryPolicyName = policies_1.systemErrorRetryPolicyName;
/**
 * A retry policy that specifically seeks to handle errors in the
 * underlying transport layer (e.g. DNS lookup failures) rather than
 * retryable error codes from the server itself.
 * @param options - Options that customize the policy.
 */
function systemErrorRetryPolicy(options = {}) {
    return (0, policies_1.systemErrorRetryPolicy)(options);
}
//# sourceMappingURL=systemErrorRetryPolicy.js.map