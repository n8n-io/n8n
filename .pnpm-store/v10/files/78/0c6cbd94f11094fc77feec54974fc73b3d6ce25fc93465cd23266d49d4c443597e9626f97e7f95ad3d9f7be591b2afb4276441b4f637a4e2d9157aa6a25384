import type { TypeSpecRuntimeLogger } from "../logger/logger.js";
import type { PipelineResponse } from "../interfaces.js";
import type { RestError } from "../restError.js";
/**
 * Information provided to the retry strategy about the current progress of the retry policy.
 */
export interface RetryInformation {
    /**
     * A {@link PipelineResponse}, if the last retry attempt succeeded.
     */
    response?: PipelineResponse;
    /**
     * A {@link RestError}, if the last retry attempt failed.
     */
    responseError?: RestError;
    /**
     * Total number of retries so far.
     */
    retryCount: number;
}
/**
 * Properties that can modify the behavior of the retry policy.
 */
export interface RetryModifiers {
    /**
     * If true, allows skipping the current strategy from running on the retry policy.
     */
    skipStrategy?: boolean;
    /**
     * Indicates to retry against this URL.
     */
    redirectTo?: string;
    /**
     * Controls whether to retry in a given number of milliseconds.
     * If provided, a new retry will be attempted.
     */
    retryAfterInMs?: number;
    /**
     * Indicates to throw this error instead of retrying.
     */
    errorToThrow?: RestError;
}
/**
 * A retry strategy is intended to define whether to retry or not, and how to retry.
 */
export interface RetryStrategy {
    /**
     * Name of the retry strategy. Used for logging.
     */
    name: string;
    /**
     * Logger. If it's not provided, a default logger for all retry strategies is used.
     */
    logger?: TypeSpecRuntimeLogger;
    /**
     * Function that determines how to proceed with the subsequent requests.
     * @param state - Retry state
     */
    retry(state: RetryInformation): RetryModifiers;
}
//# sourceMappingURL=retryStrategy.d.ts.map