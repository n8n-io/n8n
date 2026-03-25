// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { exponentialRetryStrategy } from "../retryStrategies/exponentialRetryStrategy";
import { throttlingRetryStrategy } from "../retryStrategies/throttlingRetryStrategy";
import { retryPolicy } from "./retryPolicy";
import { DEFAULT_RETRY_POLICY_COUNT } from "../constants";
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
    var _a;
    return {
        name: defaultRetryPolicyName,
        sendRequest: retryPolicy([throttlingRetryStrategy(), exponentialRetryStrategy(options)], {
            maxRetries: (_a = options.maxRetries) !== null && _a !== void 0 ? _a : DEFAULT_RETRY_POLICY_COUNT,
        }).sendRequest,
    };
}
//# sourceMappingURL=defaultRetryPolicy.js.map