// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { createAbortablePromise } from "./createAbortablePromise.js";
import { getRandomIntegerInclusive } from "@typespec/ts-http-runtime/internal/util";
const StandardAbortMessage = "The delay was aborted.";
/**
 * A wrapper for setTimeout that resolves a promise after timeInMs milliseconds.
 * @param timeInMs - The number of milliseconds to be delayed.
 * @param options - The options for delay - currently abort options
 * @returns Promise that is resolved after timeInMs
 */
export function delay(timeInMs, options) {
    let token;
    const { abortSignal, abortErrorMsg } = options !== null && options !== void 0 ? options : {};
    return createAbortablePromise((resolve) => {
        token = setTimeout(resolve, timeInMs);
    }, {
        cleanupBeforeAbort: () => clearTimeout(token),
        abortSignal,
        abortErrorMsg: abortErrorMsg !== null && abortErrorMsg !== void 0 ? abortErrorMsg : StandardAbortMessage,
    });
}
/**
 * Calculates the delay interval for retry attempts using exponential delay with jitter.
 * @param retryAttempt - The current retry attempt number.
 * @param config - The exponential retry configuration.
 * @returns An object containing the calculated retry delay.
 */
export function calculateRetryDelay(retryAttempt, config) {
    // Exponentially increase the delay each time
    const exponentialDelay = config.retryDelayInMs * Math.pow(2, retryAttempt);
    // Don't let the delay exceed the maximum
    const clampedDelay = Math.min(config.maxRetryDelayInMs, exponentialDelay);
    // Allow the final value to have some "jitter" (within 50% of the delay size) so
    // that retries across multiple clients don't occur simultaneously.
    const retryAfterInMs = clampedDelay / 2 + getRandomIntegerInclusive(0, clampedDelay / 2);
    return { retryAfterInMs };
}
//# sourceMappingURL=delay.js.map