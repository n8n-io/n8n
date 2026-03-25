"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryPolicy = retryPolicy;
const logger_1 = require("@azure/logger");
const constants_js_1 = require("../constants.js");
const policies_1 = require("@typespec/ts-http-runtime/internal/policies");
const retryPolicyLogger = (0, logger_1.createClientLogger)("core-rest-pipeline retryPolicy");
/**
 * retryPolicy is a generic policy to enable retrying requests when certain conditions are met
 */
function retryPolicy(strategies, options = { maxRetries: constants_js_1.DEFAULT_RETRY_POLICY_COUNT }) {
    // Cast is required since the TSP runtime retry strategy type is slightly different
    // very deep down (using real AbortSignal vs. AbortSignalLike in RestError).
    // In practice the difference doesn't actually matter.
    return (0, policies_1.retryPolicy)(strategies, Object.assign({ logger: retryPolicyLogger }, options));
}
//# sourceMappingURL=retryPolicy.js.map