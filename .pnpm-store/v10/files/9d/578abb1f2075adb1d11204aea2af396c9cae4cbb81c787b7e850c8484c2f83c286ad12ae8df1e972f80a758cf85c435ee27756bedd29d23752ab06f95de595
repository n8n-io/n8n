"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultRetryPolicyName = void 0;
exports.defaultRetryPolicy = defaultRetryPolicy;
const exponentialRetryStrategy_js_1 = require("../retryStrategies/exponentialRetryStrategy.js");
const throttlingRetryStrategy_js_1 = require("../retryStrategies/throttlingRetryStrategy.js");
const retryPolicy_js_1 = require("./retryPolicy.js");
const constants_js_1 = require("../constants.js");
/**
 * Name of the {@link defaultRetryPolicy}
 */
exports.defaultRetryPolicyName = "defaultRetryPolicy";
/**
 * A policy that retries according to three strategies:
 * - When the server sends a 429 response with a Retry-After header.
 * - When there are errors in the underlying transport layer (e.g. DNS lookup failures).
 * - Or otherwise if the outgoing request fails, it will retry with an exponentially increasing delay.
 */
function defaultRetryPolicy(options = {}) {
    var _a;
    return {
        name: exports.defaultRetryPolicyName,
        sendRequest: (0, retryPolicy_js_1.retryPolicy)([(0, throttlingRetryStrategy_js_1.throttlingRetryStrategy)(), (0, exponentialRetryStrategy_js_1.exponentialRetryStrategy)(options)], {
            maxRetries: (_a = options.maxRetries) !== null && _a !== void 0 ? _a : constants_js_1.DEFAULT_RETRY_POLICY_COUNT,
        }).sendRequest,
    };
}
//# sourceMappingURL=defaultRetryPolicy.js.map