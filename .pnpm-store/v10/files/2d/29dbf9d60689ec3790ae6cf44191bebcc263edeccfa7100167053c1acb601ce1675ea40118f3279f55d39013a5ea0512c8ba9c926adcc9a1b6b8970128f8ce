import {delay, rethrowAbortError} from 'abort-controller-x';
import {ClientError, ClientMiddleware, Status} from 'nice-grpc-common';

/**
 * These options are added to `CallOptions` by
 * `nice-grpc-client-middleware-retry`.
 */
export type RetryOptions = {
  /**
   * Boolean indicating whether retries are enabled.
   *
   * If the method is marked as idempotent in Protobuf, i.e. has
   *
   *     option idempotency_level = IDEMPOTENT;
   *
   * then the default is `true`. Otherwise the default is `false`.
   *
   * Method options currently work only when compiling with `ts-proto`.
   */
  retry?: boolean;
  /**
   * Base delay between retry attempts in milliseconds.
   *
   * Defaults to 1000.
   *
   * Example: if `retryBaseDelayMs` is 100, then retries will be attempted in
   * 100ms, 200ms, 400ms etc (not counting jitter).
   */
  retryBaseDelayMs?: number;
  /**
   * Maximum delay between attempts in milliseconds.
   *
   * Defaults to 30 seconds.
   *
   * Example: if `retryBaseDelayMs` is 1000 and `retryMaxDelayMs` is 3000, then
   * retries will be attempted in 1000ms, 2000ms, 3000ms, 3000ms etc (not
   * counting jitter).
   */
  retryMaxDelayMs?: number;
  /**
   * Maximum for the total number of attempts. `Infinity` is supported.
   *
   * Defaults to 1, i.e. a single retry will be attempted.
   */
  retryMaxAttempts?: number;
  /**
   * Array of retryable status codes.
   *
   * Default is `[UNKNOWN, INTERNAL, UNAVAILABLE, CANCELLED]`.
   */
  retryableStatuses?: Status[];
  /**
   * Called after receiving error with retryable status code before setting
   * backoff delay timer.
   *
   * If the error code is not retryable, or the maximum attempts exceeded, this
   * function will not be called and the error will be thrown from the client
   * method.
   */
  onRetryableError?(error: ClientError, attempt: number, delayMs: number): void;
};

const defaultRetryableStatuses: Status[] = [
  Status.UNKNOWN,
  Status.INTERNAL,
  Status.UNAVAILABLE,
  // Server may return `CANCELLED` if it is shutting down. We can distinguish
  // this from client-initiated cancellations because these are returned as
  // `AbortError`s.
  Status.CANCELLED,
];

/**
 * Client middleware that adds automatic retries to unary calls.
 */
export const retryMiddleware: ClientMiddleware<RetryOptions> =
  async function* retryMiddleware(call, options) {
    const {idempotencyLevel} = call.method.options;
    const isIdempotent =
      idempotencyLevel === 'IDEMPOTENT' ||
      idempotencyLevel === 'NO_SIDE_EFFECTS';

    const {
      retry = isIdempotent,
      retryBaseDelayMs = 1000,
      retryMaxDelayMs = 30000,
      retryMaxAttempts = 1,
      onRetryableError,
      retryableStatuses = defaultRetryableStatuses,
      ...restOptions
    } = options;

    if (call.requestStream || call.responseStream || !retry) {
      return yield* call.next(call.request, restOptions);
    }

    const signal = options.signal ?? new AbortController().signal;

    for (let attempt = 0; ; attempt++) {
      try {
        return yield* call.next(call.request, restOptions);
      } catch (error: unknown) {
        rethrowAbortError(error);

        if (
          attempt >= retryMaxAttempts ||
          !(error instanceof ClientError) ||
          !retryableStatuses.includes(error.code)
        ) {
          throw error;
        }

        // https://aws.amazon.com/ru/blogs/architecture/exponential-backoff-and-jitter/
        const backoff = Math.min(
          retryMaxDelayMs,
          Math.pow(2, attempt) * retryBaseDelayMs,
        );
        const delayMs = Math.round((backoff * (1 + Math.random())) / 2);

        onRetryableError?.(error, attempt, delayMs);

        await delay(signal, delayMs);
      }
    }
  };
