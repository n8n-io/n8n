/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export class ExponentialRetryStrategy {
    // Minimum backoff time in milliseconds
    private minExponentialBackoff: number;
    // Maximum backoff time in milliseconds
    private maxExponentialBackoff: number;
    // Maximum backoff time in milliseconds
    private exponentialDeltaBackoff: number;

    constructor(
        minExponentialBackoff: number,
        maxExponentialBackoff: number,
        exponentialDeltaBackoff: number
    ) {
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
    public calculateDelay(currentRetry: number): number {
        // Attempt 1
        if (currentRetry === 0) {
            return this.minExponentialBackoff;
        }

        // Attempt 2+
        const exponentialDelay = Math.min(
            Math.pow(2, currentRetry - 1) * this.exponentialDeltaBackoff,
            this.maxExponentialBackoff
        );

        return exponentialDelay;
    }
}
