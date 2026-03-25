// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createClientLogger } from "@azure/logger";
import { DEFAULT_RETRY_POLICY_COUNT } from "../constants.js";
import { retryPolicy as tspRetryPolicy, } from "@typespec/ts-http-runtime/internal/policies";
const retryPolicyLogger = createClientLogger("core-rest-pipeline retryPolicy");
/**
 * retryPolicy is a generic policy to enable retrying requests when certain conditions are met
 */
export function retryPolicy(strategies, options = { maxRetries: DEFAULT_RETRY_POLICY_COUNT }) {
    // Cast is required since the TSP runtime retry strategy type is slightly different
    // very deep down (using real AbortSignal vs. AbortSignalLike in RestError).
    // In practice the difference doesn't actually matter.
    return tspRetryPolicy(strategies, Object.assign({ logger: retryPolicyLogger }, options));
}
//# sourceMappingURL=retryPolicy.js.map