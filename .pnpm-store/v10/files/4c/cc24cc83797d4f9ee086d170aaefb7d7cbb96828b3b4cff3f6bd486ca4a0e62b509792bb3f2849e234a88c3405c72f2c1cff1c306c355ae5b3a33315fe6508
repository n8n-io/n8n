/**
 * Abortable version of `Promise.race`.
 *
 * Creates new inner `AbortSignal` and passes it to `executor`. That signal is
 * aborted when `signal` is aborted or any of the promises returned from
 * `executor` are fulfilled or rejected.
 *
 * Returns a promise that fulfills or rejects when any of the promises returned
 * from `executor` are fulfilled or rejected, and rejects with `AbortError` when
 * `signal` is aborted.
 *
 * The promises returned from `executor` must be abortable, i.e. once
 * `innerSignal` is aborted, they must reject with `AbortError` either
 * immediately, or after doing any async cleanup.
 *
 * Example:
 *
 *     const result = await race(signal, signal => [
 *       delay(signal, 1000).then(() => ({status: 'timeout'})),
 *       makeRequest(signal, params).then(value => ({status: 'success', value})),
 *     ]);
 *
 *     if (result.status === 'timeout') {
 *       // request timed out
 *     } else {
 *       const response = result.value;
 *     }
 */
export declare function race<T extends PromiseLike<any>>(signal: AbortSignal, executor: (innerSignal: AbortSignal) => readonly T[]): Promise<T extends PromiseLike<infer U> ? U : never>;
