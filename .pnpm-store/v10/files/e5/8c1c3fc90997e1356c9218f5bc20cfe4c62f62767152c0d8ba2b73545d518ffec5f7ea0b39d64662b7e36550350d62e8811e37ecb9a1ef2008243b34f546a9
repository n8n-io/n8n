import {AbortError, isAbortError} from './AbortError';

/**
 * Abortable version of `Promise.all`.
 *
 * Creates new inner `AbortSignal` and passes it to `executor`. That signal is
 * aborted when `signal` is aborted or any of the promises returned from
 * `executor` are rejected.
 *
 * Returns a promise that fulfills with an array of results when all of the
 * promises returned from `executor` fulfill, rejects when any of the
 * promises returned from `executor` are rejected, and rejects with `AbortError`
 * when `signal` is aborted.
 *
 * The promises returned from `executor` must be abortable, i.e. once
 * `innerSignal` is aborted, they must reject with `AbortError` either
 * immediately, or after doing any async cleanup.
 *
 * Example:
 *
 *     const [result1, result2] = await all(signal, signal => [
 *       makeRequest(signal, params1),
 *       makeRequest(signal, params2),
 *     ]);
 */
export function all<T1, T2, T3, T4, T5, T6, T7, T8, T9, T10>(
  signal: AbortSignal,
  executor: (
    innerSignal: AbortSignal,
  ) => readonly [
    PromiseLike<T1>,
    PromiseLike<T2>,
    PromiseLike<T3>,
    PromiseLike<T4>,
    PromiseLike<T5>,
    PromiseLike<T6>,
    PromiseLike<T7>,
    PromiseLike<T8>,
    PromiseLike<T9>,
    PromiseLike<T10>,
  ],
): Promise<[T1, T2, T3, T4, T5, T6, T7, T8, T9, T10]>;
export function all<T1, T2, T3, T4, T5, T6, T7, T8, T9>(
  signal: AbortSignal,
  executor: (
    innerSignal: AbortSignal,
  ) => readonly [
    PromiseLike<T1>,
    PromiseLike<T2>,
    PromiseLike<T3>,
    PromiseLike<T4>,
    PromiseLike<T5>,
    PromiseLike<T6>,
    PromiseLike<T7>,
    PromiseLike<T8>,
    PromiseLike<T9>,
  ],
): Promise<[T1, T2, T3, T4, T5, T6, T7, T8, T9]>;
export function all<T1, T2, T3, T4, T5, T6, T7, T8>(
  signal: AbortSignal,
  executor: (
    innerSignal: AbortSignal,
  ) => readonly [
    PromiseLike<T1>,
    PromiseLike<T2>,
    PromiseLike<T3>,
    PromiseLike<T4>,
    PromiseLike<T5>,
    PromiseLike<T6>,
    PromiseLike<T7>,
    PromiseLike<T8>,
  ],
): Promise<[T1, T2, T3, T4, T5, T6, T7, T8]>;
export function all<T1, T2, T3, T4, T5, T6, T7>(
  signal: AbortSignal,
  executor: (
    innerSignal: AbortSignal,
  ) => readonly [
    PromiseLike<T1>,
    PromiseLike<T2>,
    PromiseLike<T3>,
    PromiseLike<T4>,
    PromiseLike<T5>,
    PromiseLike<T6>,
    PromiseLike<T7>,
  ],
): Promise<[T1, T2, T3, T4, T5, T6, T7]>;
export function all<T1, T2, T3, T4, T5, T6>(
  signal: AbortSignal,
  executor: (
    innerSignal: AbortSignal,
  ) => readonly [
    PromiseLike<T1>,
    PromiseLike<T2>,
    PromiseLike<T3>,
    PromiseLike<T4>,
    PromiseLike<T5>,
    PromiseLike<T6>,
  ],
): Promise<[T1, T2, T3, T4, T5, T6]>;
export function all<T1, T2, T3, T4, T5>(
  signal: AbortSignal,
  executor: (
    innerSignal: AbortSignal,
  ) => readonly [
    PromiseLike<T1>,
    PromiseLike<T2>,
    PromiseLike<T3>,
    PromiseLike<T4>,
    PromiseLike<T5>,
  ],
): Promise<[T1, T2, T3, T4, T5]>;
export function all<T1, T2, T3, T4>(
  signal: AbortSignal,
  executor: (
    innerSignal: AbortSignal,
  ) => readonly [
    PromiseLike<T1>,
    PromiseLike<T2>,
    PromiseLike<T3>,
    PromiseLike<T4>,
  ],
): Promise<[T1, T2, T3, T4]>;
export function all<T1, T2, T3>(
  signal: AbortSignal,
  executor: (
    innerSignal: AbortSignal,
  ) => readonly [PromiseLike<T1>, PromiseLike<T2>, PromiseLike<T3>],
): Promise<[T1, T2, T3]>;
export function all<T1, T2>(
  signal: AbortSignal,
  executor: (
    innerSignal: AbortSignal,
  ) => readonly [PromiseLike<T1>, PromiseLike<T2>],
): Promise<[T1, T2]>;
export function all<T>(
  signal: AbortSignal,
  executor: (innerSignal: AbortSignal) => readonly PromiseLike<T>[],
): Promise<T[]>;
export function all<T>(
  signal: AbortSignal,
  executor: (innerSignal: AbortSignal) => readonly PromiseLike<T>[],
): Promise<T[]> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new AbortError());
      return;
    }

    const innerAbortController = new AbortController();

    const promises = executor(innerAbortController.signal);

    if (promises.length === 0) {
      resolve([]);
      return;
    }

    const abortListener = () => {
      innerAbortController.abort();
    };

    signal.addEventListener('abort', abortListener);

    let rejection: {reason: any} | undefined;
    const results = new Array<T>(promises.length);

    let settledCount = 0;

    function settled() {
      settledCount += 1;

      if (settledCount === promises.length) {
        signal.removeEventListener('abort', abortListener);

        if (rejection != null) {
          reject(rejection.reason);
        } else {
          resolve(results);
        }
      }
    }

    for (const [i, promise] of promises.entries()) {
      promise.then(
        value => {
          results[i] = value;

          settled();
        },
        reason => {
          innerAbortController.abort();

          if (
            rejection == null ||
            (!isAbortError(reason) && isAbortError(rejection.reason))
          ) {
            rejection = {reason};
          }

          settled();
        },
      );
    }
  });
}
