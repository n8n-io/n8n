import { delay } from './delay';
import { rethrowAbortError } from './AbortError';
/**
 * Retry function with exponential backoff.
 *
 * The function receives AbortSignal, attempt number starting with 0, and reset
 * function that sets attempt number to -1 so that the next attempt will be
 * made without delay.
 */
export async function retry(signal, fn, options = {}) {
    const { baseMs = 1000, maxDelayMs = 30000, onError, maxAttempts = Infinity, } = options;
    let attempt = 0;
    const reset = () => {
        attempt = -1;
    };
    while (true) {
        try {
            return await fn(signal, attempt, reset);
        }
        catch (error) {
            rethrowAbortError(error);
            if (attempt >= maxAttempts) {
                throw error;
            }
            let delayMs;
            if (attempt === -1) {
                delayMs = 0;
            }
            else {
                // https://aws.amazon.com/ru/blogs/architecture/exponential-backoff-and-jitter/
                const backoff = Math.min(maxDelayMs, Math.pow(2, attempt) * baseMs);
                delayMs = Math.round((backoff * (1 + Math.random())) / 2);
            }
            if (onError) {
                onError(error, attempt, delayMs);
            }
            if (delayMs !== 0) {
                await delay(signal, delayMs);
            }
            attempt += 1;
        }
    }
}
//# sourceMappingURL=retry.js.map