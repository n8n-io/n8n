"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.systemErrorRetryPolicyName = void 0;
exports.systemErrorRetryPolicy = systemErrorRetryPolicy;
const exponentialRetryStrategy_js_1 = require("../retryStrategies/exponentialRetryStrategy.js");
const retryPolicy_js_1 = require("./retryPolicy.js");
const constants_js_1 = require("../constants.js");
/**
 * Name of the {@link systemErrorRetryPolicy}
 */
exports.systemErrorRetryPolicyName = "systemErrorRetryPolicy";
/**
 * A retry policy that specifically seeks to handle errors in the
 * underlying transport layer (e.g. DNS lookup failures) rather than
 * retryable error codes from the server itself.
 * @param options - Options that customize the policy.
 */
function systemErrorRetryPolicy(options = {}) {
    return {
        name: exports.systemErrorRetryPolicyName,
        sendRequest: (0, retryPolicy_js_1.retryPolicy)([
            (0, exponentialRetryStrategy_js_1.exponentialRetryStrategy)({
                ...options,
                ignoreHttpStatusCodes: true,
            }),
        ], {
            maxRetries: options.maxRetries ?? constants_js_1.DEFAULT_RETRY_POLICY_COUNT,
        }).sendRequest,
    };
}
//# sourceMappingURL=systemErrorRetryPolicy.js.map