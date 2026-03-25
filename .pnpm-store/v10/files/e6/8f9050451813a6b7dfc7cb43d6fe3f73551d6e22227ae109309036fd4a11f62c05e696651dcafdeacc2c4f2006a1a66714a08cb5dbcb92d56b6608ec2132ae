import { AbortError, isAbortError } from './AbortError';
export function all(signal, executor) {
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
        let rejection;
        const results = new Array(promises.length);
        let settledCount = 0;
        function settled() {
            settledCount += 1;
            if (settledCount === promises.length) {
                signal.removeEventListener('abort', abortListener);
                if (rejection != null) {
                    reject(rejection.reason);
                }
                else {
                    resolve(results);
                }
            }
        }
        for (const [i, promise] of promises.entries()) {
            promise.then(value => {
                results[i] = value;
                settled();
            }, reason => {
                innerAbortController.abort();
                if (rejection == null ||
                    (!isAbortError(reason) && isAbortError(rejection.reason))) {
                    rejection = { reason };
                }
                settled();
            });
        }
    });
}
//# sourceMappingURL=all.js.map