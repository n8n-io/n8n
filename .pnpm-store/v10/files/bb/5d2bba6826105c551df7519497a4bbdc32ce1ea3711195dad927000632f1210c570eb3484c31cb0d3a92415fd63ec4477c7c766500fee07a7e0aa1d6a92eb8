import type { PipelinePolicy } from "../pipeline.js";
/**
 * The programmatic identifier of the exponentialRetryPolicy.
 */
export declare const exponentialRetryPolicyName = "exponentialRetryPolicy";
/**
 * Options that control how to retry failed requests.
 */
export interface ExponentialRetryPolicyOptions {
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
 * A policy that attempts to retry requests while introducing an exponentially increasing delay.
 * @param options - Options that configure retry logic.
 */
export declare function exponentialRetryPolicy(options?: ExponentialRetryPolicyOptions): PipelinePolicy;
//# sourceMappingURL=exponentialRetryPolicy.d.ts.map