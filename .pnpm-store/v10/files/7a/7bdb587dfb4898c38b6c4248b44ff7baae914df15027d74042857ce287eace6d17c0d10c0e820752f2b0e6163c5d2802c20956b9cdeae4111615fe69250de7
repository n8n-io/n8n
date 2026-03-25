import { AbortError } from './AbortError';
/**
 * Similar to `new Promise(executor)`, but allows executor to return abort
 * callback that is called once `signal` is aborted.
 *
 * Returned promise rejects with `AbortError` once `signal` is aborted.
 *
 * Callback can return a promise, e.g. for doing any async cleanup. In this
 * case, the promise returned from `execute` rejects with `AbortError` after
 * that promise fulfills.
 */
export function execute(signal, executor) {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new AbortError());
            return;
        }
        let removeAbortListener;
        let finished = false;
        function finish() {
            if (!finished) {
                finished = true;
                if (removeAbortListener != null) {
                    removeAbortListener();
                }
            }
        }
        const callback = executor(value => {
            resolve(value);
            finish();
        }, reason => {
            reject(reason);
            finish();
        });
        if (!finished) {
            const listener = () => {
                const callbackResult = callback();
                if (callbackResult == null) {
                    reject(new AbortError());
                }
                else {
                    callbackResult.then(() => {
                        reject(new AbortError());
                    }, reason => {
                        reject(reason);
                    });
                }
                finish();
            };
            signal.addEventListener('abort', listener);
            removeAbortListener = () => {
                signal.removeEventListener('abort', listener);
            };
        }
    });
}
//# sourceMappingURL=execute.js.map