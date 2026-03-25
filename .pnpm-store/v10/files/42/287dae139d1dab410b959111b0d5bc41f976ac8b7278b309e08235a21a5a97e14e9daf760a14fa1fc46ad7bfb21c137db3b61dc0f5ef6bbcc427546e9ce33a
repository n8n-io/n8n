import type { PipelinePolicy } from "../pipeline.js";
/**
 * Name of the {@link systemErrorRetryPolicy}
 */
export declare const systemErrorRetryPolicyName = "systemErrorRetryPolicy";
/**
 * Options that control how to retry failed requests.
 */
export interface SystemErrorRetryPolicyOptions {
    /**
     * The maximum number of retry attempts. Defaults to 3.
     */
    maxRetries?: number;
    /**
     * The amount of delay in milliseconds between retry attempts. Defaults to 1000
     * (1 second.) The delay increases exponentially with each retry up to a maximum
     * specified by maxRetryDelayInMs.
     */
    retryDelayInMs?: number;
    /**
     * The maximum delay in milliseconds allowed before retrying an operation. Defaults
     * to 64000 (64 seconds).
     */
    maxRetryDelayInMs?: number;
}
/**
 * A retry policy that specifically seeks to handle errors in the
 * underlying transport layer (e.g. DNS lookup failures) rather than
 * retryable error codes from the server itself.
 * @param options - Options that customize the policy.
 */
export declare function systemErrorRetryPolicy(options?: SystemErrorRetryPolicyOptions): PipelinePolicy;
//# sourceMappingURL=systemErrorRetryPolicy.d.ts.map