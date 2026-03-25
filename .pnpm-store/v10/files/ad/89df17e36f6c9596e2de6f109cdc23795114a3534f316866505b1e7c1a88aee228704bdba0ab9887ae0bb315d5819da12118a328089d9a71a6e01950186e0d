import type { AbortOptions } from "./aborterUtils.js";
/**
 * Options for support abort functionality for the delay method
 */
export interface DelayOptions extends AbortOptions {
}
/**
 * A wrapper for setTimeout that resolves a promise after timeInMs milliseconds.
 * @param timeInMs - The number of milliseconds to be delayed.
 * @param options - The options for delay - currently abort options
 * @returns Promise that is resolved after timeInMs
 */
export declare function delay(timeInMs: number, options?: DelayOptions): Promise<void>;
/**
 * Calculates the delay interval for retry attempts using exponential delay with jitter.
 * @param retryAttempt - The current retry attempt number.
 * @param config - The exponential retry configuration.
 * @returns An object containing the calculated retry delay.
 */
export declare function calculateRetryDelay(retryAttempt: number, config: {
    retryDelayInMs: number;
    maxRetryDelayInMs: number;
}): {
    retryAfterInMs: number;
};
//# sourceMappingURL=delay.d.ts.map