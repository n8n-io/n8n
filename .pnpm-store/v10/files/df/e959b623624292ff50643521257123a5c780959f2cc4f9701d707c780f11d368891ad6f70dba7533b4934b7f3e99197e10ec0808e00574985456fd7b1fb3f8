import type { PipelinePolicy } from "../pipeline.js";
/**
 * Name of the {@link throttlingRetryPolicy}
 */
export declare const throttlingRetryPolicyName = "throttlingRetryPolicy";
/**
 * Options that control how to retry failed requests.
 */
export interface ThrottlingRetryPolicyOptions {
    /**
     * The maximum number of retry attempts. Defaults to 3.
     */
    maxRetries?: number;
}
/**
 * A policy that retries when the server sends a 429 response with a Retry-After header.
 *
 * To learn more, please refer to
 * https://learn.microsoft.com/en-us/azure/azure-resource-manager/resource-manager-request-limits,
 * https://learn.microsoft.com/en-us/azure/azure-subscription-service-limits and
 * https://learn.microsoft.com/en-us/azure/virtual-machines/troubleshooting/troubleshooting-throttling-errors
 *
 * @param options - Options that configure retry logic.
 */
export declare function throttlingRetryPolicy(options?: ThrottlingRetryPolicyOptions): PipelinePolicy;
//# sourceMappingURL=throttlingRetryPolicy.d.ts.map