import type { PipelineResponse } from "../interfaces.js";
import type { RestError } from "../restError.js";
import type { RetryStrategy } from "./retryStrategy.js";
/**
 * A retry strategy that retries with an exponentially increasing delay in these two cases:
 * - When there are errors in the underlying transport layer (e.g. DNS lookup failures).
 * - Or otherwise if the outgoing request fails (408, greater or equal than 500, except for 501 and 505).
 */
export declare function exponentialRetryStrategy(options?: {
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
    /**
     * If true it won't retry if it received a system error.
     */
    ignoreSystemErrors?: boolean;
    /**
     * If true it won't retry if it received a non-fatal HTTP status code.
     */
    ignoreHttpStatusCodes?: boolean;
}): RetryStrategy;
/**
 * A response is a retry response if it has status codes:
 * - 408, or
 * - Greater or equal than 500, except for 501 and 505.
 */
export declare function isExponentialRetryResponse(response?: PipelineResponse): boolean;
/**
 * Determines whether an error from a pipeline response was triggered in the network layer.
 */
export declare function isSystemError(err?: RestError): boolean;
//# sourceMappingURL=exponentialRetryStrategy.d.ts.map