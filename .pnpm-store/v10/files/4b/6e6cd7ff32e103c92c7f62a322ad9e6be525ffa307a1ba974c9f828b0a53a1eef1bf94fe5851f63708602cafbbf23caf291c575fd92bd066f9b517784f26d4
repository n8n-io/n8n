export declare type ProactiveRetryOptions = {
    /**
     * Base delay between attempts in milliseconds.
     *
     * Defaults to 1000.
     *
     * Example: if `baseMs` is 100, then retries will be attempted in 100ms,
     * 200ms, 400ms etc (not counting jitter).
     */
    baseMs?: number;
    /**
     * Maximum for the total number of attempts.
     *
     * Defaults to `Infinity`.
     */
    maxAttempts?: number;
    /**
     * Called after each failed attempt.
     *
     * Rethrow error from this callback to prevent further retries.
     */
    onError?: (error: unknown, attempt: number) => void;
};
/**
 * Proactively retry a function with exponential backoff.
 *
 * Also known as hedging.
 *
 * The function will be called multiple times in parallel until it succeeds, in
 * which case all the other calls will be aborted.
 */
export declare function proactiveRetry<T>(signal: AbortSignal, fn: (signal: AbortSignal, attempt: number) => Promise<T>, options?: ProactiveRetryOptions): Promise<T>;
