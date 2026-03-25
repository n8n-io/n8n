import {delay} from './delay';
import {rethrowAbortError} from './AbortError';

export type RetryOptions = {
  /**
   * Starting delay before first retry attempt in milliseconds.
   *
   * Defaults to 1000.
   *
   * Example: if `baseMs` is 100, then retries will be attempted in 100ms,
   * 200ms, 400ms etc (not counting jitter).
   */
  baseMs?: number;
  /**
   * Maximum delay between attempts in milliseconds.
   *
   * Defaults to 30 seconds.
   *
   * Example: if `baseMs` is 1000 and `maxDelayMs` is 3000, then retries will be
   * attempted in 1000ms, 2000ms, 3000ms, 3000ms etc (not counting jitter).
   */
  maxDelayMs?: number;
  /**
   * Maximum for the total number of attempts.
   *
   * Defaults to `Infinity`.
   */
  maxAttempts?: number;
  /**
   * Called after each failed attempt before setting delay timer.
   *
   * Rethrow error from this callback to prevent further retries.
   */
  onError?: (error: unknown, attempt: number, delayMs: number) => void;
};

/**
 * Retry function with exponential backoff.
 *
 * The function receives AbortSignal, attempt number starting with 0, and reset
 * function that sets attempt number to -1 so that the next attempt will be
 * made without delay.
 */
export async function retry<T>(
  signal: AbortSignal,
  fn: (signal: AbortSignal, attempt: number, reset: () => void) => Promise<T>,
  options: RetryOptions = {},
): Promise<T> {
  const {
    baseMs = 1000,
    maxDelayMs = 30000,
    onError,
    maxAttempts = Infinity,
  } = options;

  let attempt = 0;

  const reset = () => {
    attempt = -1;
  };

  while (true) {
    try {
      return await fn(signal, attempt, reset);
    } catch (error) {
      rethrowAbortError(error);

      if (attempt >= maxAttempts) {
        throw error;
      }

      let delayMs: number;

      if (attempt === -1) {
        delayMs = 0;
      } else {
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
