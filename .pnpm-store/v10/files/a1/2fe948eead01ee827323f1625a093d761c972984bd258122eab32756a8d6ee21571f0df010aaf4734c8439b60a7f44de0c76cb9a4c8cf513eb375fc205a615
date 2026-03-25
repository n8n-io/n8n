"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateRetryDelay = calculateRetryDelay;
const random_js_1 = require("./random.js");
/**
 * Calculates the delay interval for retry attempts using exponential delay with jitter.
 * @param retryAttempt - The current retry attempt number.
 * @param config - The exponential retry configuration.
 * @returns An object containing the calculated retry delay.
 */
function calculateRetryDelay(retryAttempt, config) {
    // Exponentially increase the delay each time
    const exponentialDelay = config.retryDelayInMs * Math.pow(2, retryAttempt);
    // Don't let the delay exceed the maximum
    const clampedDelay = Math.min(config.maxRetryDelayInMs, exponentialDelay);
    // Allow the final value to have some "jitter" (within 50% of the delay size) so
    // that retries across multiple clients don't occur simultaneously.
    const retryAfterInMs = clampedDelay / 2 + (0, random_js_1.getRandomIntegerInclusive)(0, clampedDelay / 2);
    return { retryAfterInMs };
}
//# sourceMappingURL=delay.js.map