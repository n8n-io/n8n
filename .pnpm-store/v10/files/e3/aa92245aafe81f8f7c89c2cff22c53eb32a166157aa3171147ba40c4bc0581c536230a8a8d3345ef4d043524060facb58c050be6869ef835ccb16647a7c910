// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { throttlingRetryStrategy } from "../retryStrategies/throttlingRetryStrategy.js";
import { retryPolicy } from "./retryPolicy.js";
import { DEFAULT_RETRY_POLICY_COUNT } from "../constants.js";
/**
 * Name of the {@link throttlingRetryPolicy}
 */
export const throttlingRetryPolicyName = "throttlingRetryPolicy";
/**
 * A policy that retries when the server sends a 429 response with a Retry-After header.
 *
 * To learn more, please refer to
 * https://learn.microsoft.com/azure/azure-resource-manager/resource-manager-request-limits,
 * https://learn.microsoft.com/azure/azure-subscription-service-limits and
 * https://learn.microsoft.com/azure/virtual-machines/troubleshooting/troubleshooting-throttling-errors
 *
 * @param options - Options that configure retry logic.
 */
export function throttlingRetryPolicy(options = {}) {
    return {
        name: throttlingRetryPolicyName,
        sendRequest: retryPolicy([throttlingRetryStrategy()], {
            maxRetries: options.maxRetries ?? DEFAULT_RETRY_POLICY_COUNT,
        }).sendRequest,
    };
}
//# sourceMappingURL=throttlingRetryPolicy.js.map