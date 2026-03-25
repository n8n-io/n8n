// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { exponentialRetryStrategy } from "../retryStrategies/exponentialRetryStrategy.js";
import { retryPolicy } from "./retryPolicy.js";
import { DEFAULT_RETRY_POLICY_COUNT } from "../constants.js";
/**
 * Name of the {@link systemErrorRetryPolicy}
 */
export const systemErrorRetryPolicyName = "systemErrorRetryPolicy";
/**
 * A retry policy that specifically seeks to handle errors in the
 * underlying transport layer (e.g. DNS lookup failures) rather than
 * retryable error codes from the server itself.
 * @param options - Options that customize the policy.
 */
export function systemErrorRetryPolicy(options = {}) {
    return {
        name: systemErrorRetryPolicyName,
        sendRequest: retryPolicy([
            exponentialRetryStrategy({
                ...options,
                ignoreHttpStatusCodes: true,
            }),
        ], {
            maxRetries: options.maxRetries ?? DEFAULT_RETRY_POLICY_COUNT,
        }).sendRequest,
    };
}
//# sourceMappingURL=systemErrorRetryPolicy.js.map