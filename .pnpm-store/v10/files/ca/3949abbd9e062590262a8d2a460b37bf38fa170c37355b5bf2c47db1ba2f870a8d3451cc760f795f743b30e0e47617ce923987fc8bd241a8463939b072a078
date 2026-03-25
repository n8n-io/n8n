// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { exponentialRetryStrategy } from "../retryStrategies/exponentialRetryStrategy.js";
import { throttlingRetryStrategy } from "../retryStrategies/throttlingRetryStrategy.js";
import { retryPolicy } from "./retryPolicy.js";
import { DEFAULT_RETRY_POLICY_COUNT } from "../constants.js";
/**
 * Name of the {@link defaultRetryPolicy}
 */
export const defaultRetryPolicyName = "defaultRetryPolicy";
/**
 * A policy that retries according to three strategies:
 * - When the server sends a 429 response with a Retry-After header.
 * - When there are errors in the underlying transport layer (e.g. DNS lookup failures).
 * - Or otherwise if the outgoing request fails, it will retry with an exponentially increasing delay.
 */
export function defaultRetryPolicy(options = {}) {
    return {
        name: defaultRetryPolicyName,
        sendRequest: retryPolicy([throttlingRetryStrategy(), exponentialRetryStrategy(options)], {
            maxRetries: options.maxRetries ?? DEFAULT_RETRY_POLICY_COUNT,
        }).sendRequest,
    };
}
//# sourceMappingURL=defaultRetryPolicy.js.map