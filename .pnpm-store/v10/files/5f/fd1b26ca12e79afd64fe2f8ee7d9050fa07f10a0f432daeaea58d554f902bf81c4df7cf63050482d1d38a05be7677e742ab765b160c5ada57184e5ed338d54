// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
import { exponentialRetryStrategy } from "../retryStrategies/exponentialRetryStrategy";
import { retryPolicy } from "./retryPolicy";
import { DEFAULT_RETRY_POLICY_COUNT } from "../constants";
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
    var _a;
    return {
        name: systemErrorRetryPolicyName,
        sendRequest: retryPolicy([
            exponentialRetryStrategy(Object.assign(Object.assign({}, options), { ignoreHttpStatusCodes: true })),
        ], {
            maxRetries: (_a = options.maxRetries) !== null && _a !== void 0 ? _a : DEFAULT_RETRY_POLICY_COUNT,
        }).sendRequest,
    };
}
//# sourceMappingURL=systemErrorRetryPolicy.js.map