// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { throttlingRetryPolicyName as tspThrottlingRetryPolicyName, throttlingRetryPolicy as tspThrottlingRetryPolicy, } from "@typespec/ts-http-runtime/internal/policies";
/**
 * Name of the {@link throttlingRetryPolicy}
 */
export const throttlingRetryPolicyName = tspThrottlingRetryPolicyName;
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
    return tspThrottlingRetryPolicy(options);
}
//# sourceMappingURL=throttlingRetryPolicy.js.map