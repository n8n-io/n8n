export declare class ExponentialRetryStrategy {
    private minExponentialBackoff;
    private maxExponentialBackoff;
    private exponentialDeltaBackoff;
    constructor(minExponentialBackoff: number, maxExponentialBackoff: number, exponentialDeltaBackoff: number);
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
    calculateDelay(currentRetry: number): number;
}
//# sourceMappingURL=ExponentialRetryStrategy.d.ts.map