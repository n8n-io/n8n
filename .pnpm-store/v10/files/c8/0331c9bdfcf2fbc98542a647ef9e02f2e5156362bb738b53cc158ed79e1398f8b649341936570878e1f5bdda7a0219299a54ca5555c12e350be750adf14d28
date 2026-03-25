import type { PipelinePolicy } from "../pipeline.js";
import type { RetryStrategy } from "../retryStrategies/retryStrategy.js";
import type { TypeSpecRuntimeLogger } from "../logger/logger.js";
/**
 * Options to the {@link retryPolicy}
 */
export interface RetryPolicyOptions {
    /**
     * Maximum number of retries. If not specified, it will limit to 3 retries.
     */
    maxRetries?: number;
    /**
     * Logger. If it's not provided, a default logger is used.
     */
    logger?: TypeSpecRuntimeLogger;
}
/**
 * retryPolicy is a generic policy to enable retrying requests when certain conditions are met
 */
export declare function retryPolicy(strategies: RetryStrategy[], options?: RetryPolicyOptions): PipelinePolicy;
//# sourceMappingURL=retryPolicy.d.ts.map