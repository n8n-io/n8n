import { APICallError } from '@ai-sdk/provider';
import { delay, getErrorMessage, isAbortError } from '@ai-sdk/provider-utils';
import { RetryError } from './retry-error';

export type RetryFunction = <OUTPUT>(
  fn: () => PromiseLike<OUTPUT>,
) => PromiseLike<OUTPUT>;

function getRetryDelayInMs({
  error,
  exponentialBackoffDelay,
}: {
  error: APICallError;
  exponentialBackoffDelay: number;
}): number {
  const headers = error.responseHeaders;

  if (!headers) return exponentialBackoffDelay;

  let ms: number | undefined;

  // retry-ms is more precise than retry-after and used by e.g. OpenAI
  const retryAfterMs = headers['retry-after-ms'];
  if (retryAfterMs) {
    const timeoutMs = parseFloat(retryAfterMs);
    if (!Number.isNaN(timeoutMs)) {
      ms = timeoutMs;
    }
  }

  // About the Retry-After header: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Retry-After
  const retryAfter = headers['retry-after'];
  if (retryAfter && ms === undefined) {
    const timeoutSeconds = parseFloat(retryAfter);
    if (!Number.isNaN(timeoutSeconds)) {
      ms = timeoutSeconds * 1000;
    } else {
      ms = Date.parse(retryAfter) - Date.now();
    }
  }

  // check that the delay is reasonable:
  if (
    ms != null &&
    !Number.isNaN(ms) &&
    0 <= ms &&
    (ms < 60 * 1000 || ms < exponentialBackoffDelay)
  ) {
    return ms;
  }

  return exponentialBackoffDelay;
}

/**
 * The `retryWithExponentialBackoffRespectingRetryHeaders` strategy retries a failed API call with an exponential backoff,
 * while respecting rate limit headers (retry-after-ms and retry-after) if they are provided and reasonable (0-60 seconds).
 * You can configure the maximum number of retries, the initial delay, and the backoff factor.
 */
export const retryWithExponentialBackoffRespectingRetryHeaders =
  ({
    maxRetries = 2,
    initialDelayInMs = 2000,
    backoffFactor = 2,
    abortSignal,
  }: {
    maxRetries?: number;
    initialDelayInMs?: number;
    backoffFactor?: number;
    abortSignal?: AbortSignal;
  } = {}): RetryFunction =>
  async <OUTPUT>(f: () => PromiseLike<OUTPUT>) =>
    _retryWithExponentialBackoff(f, {
      maxRetries,
      delayInMs: initialDelayInMs,
      backoffFactor,
      abortSignal,
    });

async function _retryWithExponentialBackoff<OUTPUT>(
  f: () => PromiseLike<OUTPUT>,
  {
    maxRetries,
    delayInMs,
    backoffFactor,
    abortSignal,
  }: {
    maxRetries: number;
    delayInMs: number;
    backoffFactor: number;
    abortSignal: AbortSignal | undefined;
  },
  errors: unknown[] = [],
): Promise<OUTPUT> {
  try {
    return await f();
  } catch (error) {
    if (isAbortError(error)) {
      throw error; // don't retry when the request was aborted
    }

    if (maxRetries === 0) {
      throw error; // don't wrap the error when retries are disabled
    }

    const errorMessage = getErrorMessage(error);
    const newErrors = [...errors, error];
    const tryNumber = newErrors.length;

    if (tryNumber > maxRetries) {
      throw new RetryError({
        message: `Failed after ${tryNumber} attempts. Last error: ${errorMessage}`,
        reason: 'maxRetriesExceeded',
        errors: newErrors,
      });
    }

    if (
      error instanceof Error &&
      APICallError.isInstance(error) &&
      error.isRetryable === true &&
      tryNumber <= maxRetries
    ) {
      await delay(
        getRetryDelayInMs({
          error,
          exponentialBackoffDelay: delayInMs,
        }),
        { abortSignal },
      );

      return _retryWithExponentialBackoff(
        f,
        {
          maxRetries,
          delayInMs: backoffFactor * delayInMs,
          backoffFactor,
          abortSignal,
        },
        newErrors,
      );
    }

    if (tryNumber === 1) {
      throw error; // don't wrap the error when a non-retryable error occurs on the first try
    }

    throw new RetryError({
      message: `Failed after ${tryNumber} attempts with non-retryable error: '${errorMessage}'`,
      reason: 'errorNotRetryable',
      errors: newErrors,
    });
  }
}
