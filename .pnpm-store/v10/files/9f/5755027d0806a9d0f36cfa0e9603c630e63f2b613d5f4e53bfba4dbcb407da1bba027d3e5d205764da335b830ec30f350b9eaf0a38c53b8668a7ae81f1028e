/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class ExponentialRetryStrategy {
    constructor(minExponentialBackoff, maxExponentialBackoff, exponentialDeltaBackoff) {
        this.minExponentialBackoff = minExponentialBackoff;
        this.maxExponentialBackoff = maxExponentialBackoff;
        this.exponentialDeltaBackoff = exponentialDeltaBackoff;
    }
    /**
     * Calculates the exponential delay based on the current retry attempt.
     *
     * @param {number} currentRetry - The current retry attempt number.
     * @returns {number} - The calculated exponential delay in milliseconds.
     *
     * The delay is calculated using the formula:
     * - If `currentRetry` is 0, it returns the minimum backoff time.
     * - Otherwise, it calculates the delay as the minimum of:
     *   - `(2^(currentRetry - 1)) * deltaBackoff`
     *   - `maxBackoff`
     *
     * This ensures that the delay increases exponentially with each retry attempt,
     * but does not exceed the maximum backoff time.
     */
    calculateDelay(currentRetry) {
        // Attempt 1
        if (currentRetry === 0) {
            return this.minExponentialBackoff;
        }
        // Attempt 2+
        const exponentialDelay = Math.min(Math.pow(2, currentRetry - 1) * this.exponentialDeltaBackoff, this.maxExponentialBackoff);
        return exponentialDelay;
    }
}

export { ExponentialRetryStrategy };
//# sourceMappingURL=ExponentialRetryStrategy.mjs.map
