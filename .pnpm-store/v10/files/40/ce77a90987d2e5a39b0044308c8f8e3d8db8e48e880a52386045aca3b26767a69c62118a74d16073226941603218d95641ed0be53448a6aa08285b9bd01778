// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { exponentialRetryStrategy } from "../retryStrategies/exponentialRetryStrategy.js";
import { retryPolicy } from "./retryPolicy.js";
import { DEFAULT_RETRY_POLICY_COUNT } from "../constants.js";
/**
 * The programmatic identifier of the exponentialRetryPolicy.
 */
export const exponentialRetryPolicyName = "exponentialRetryPolicy";
/**
 * A policy that attempts to retry requests while introducing an exponentially increasing delay.
 * @param options - Options that configure retry logic.
 */
export function exponentialRetryPolicy(options = {}) {
    return retryPolicy([
        exponentialRetryStrategy({
            ...options,
            ignoreSystemErrors: true,
        }),
    ], {
        maxRetries: options.maxRetries ?? DEFAULT_RETRY_POLICY_COUNT,
    });
}
//# sourceMappingURL=exponentialRetryPolicy.js.map