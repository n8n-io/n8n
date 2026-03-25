import {isAbortError, catchAbortError} from './AbortError';
import {delay} from './delay';
import {execute} from './execute';

export type ProactiveRetryOptions = {
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
export function proactiveRetry<T>(
  signal: AbortSignal,
  fn: (signal: AbortSignal, attempt: number) => Promise<T>,
  options: ProactiveRetryOptions = {},
): Promise<T> {
  const {baseMs = 1000, onError, maxAttempts = Infinity} = options;

  return execute(signal, (resolve, reject) => {
    const innerAbortController = new AbortController();
    let attemptsExhausted = false;

    const promises = new Map</* attempt */ number, Promise<T>>();

    function handleFulfilled(value: T) {
      innerAbortController.abort();
      promises.clear();

      resolve(value);
    }

    function handleRejected(err: unknown, attempt: number) {
      promises.delete(attempt);

      if (attemptsExhausted && promises.size === 0) {
        reject(err);

        return;
      }

      if (isAbortError(err)) {
        return;
      }

      if (onError) {
        try {
          onError(err, attempt);
        } catch (err) {
          innerAbortController.abort();
          promises.clear();

          reject(err);
        }
      }
    }

    async function makeAttempts(signal: AbortSignal) {
      for (let attempt = 0; ; attempt++) {
        const promise = fn(signal, attempt);

        promises.set(attempt, promise);

        promise.then(handleFulfilled, err => handleRejected(err, attempt));

        if (attempt + 1 >= maxAttempts) {
          break;
        }

        // https://aws.amazon.com/ru/blogs/architecture/exponential-backoff-and-jitter/
        const backoff = Math.pow(2, attempt) * baseMs;
        const delayMs = Math.round((backoff * (1 + Math.random())) / 2);

        await delay(signal, delayMs);
      }

      attemptsExhausted = true;
    }

    makeAttempts(innerAbortController.signal).catch(catchAbortError);

    return () => {
      innerAbortController.abort();
    };
  });
}
