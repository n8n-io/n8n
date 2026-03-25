import { AbortError, isAbortError } from './AbortError';
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
export function race(signal, executor) {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new AbortError());
            return;
        }
        const innerAbortController = new AbortController();
        const promises = executor(innerAbortController.signal);
        const abortListener = () => {
            innerAbortController.abort();
        };
        signal.addEventListener('abort', abortListener);
        let settledCount = 0;
        function settled(result) {
            innerAbortController.abort();
            settledCount += 1;
            if (settledCount === promises.length) {
                signal.removeEventListener('abort', abortListener);
                if (result.status === 'fulfilled') {
                    resolve(result.value);
                }
                else {
                    reject(result.reason);
                }
            }
        }
        let result;
        for (const promise of promises) {
            promise.then(value => {
                if (result == null) {
                    result = { status: 'fulfilled', value };
                }
                settled(result);
            }, reason => {
                if (result == null ||
                    (!isAbortError(reason) &&
                        (result.status === 'fulfilled' || isAbortError(result.reason)))) {
                    result = { status: 'rejected', reason };
                }
                settled(result);
            });
        }
    });
}
//# sourceMappingURL=race.js.map