"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.all = void 0;
const AbortError_1 = require("./AbortError");
function all(signal, executor) {
    return new Promise((resolve, reject) => {
        if (signal.aborted) {
            reject(new AbortError_1.AbortError());
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
                    (!(0, AbortError_1.isAbortError)(reason) && (0, AbortError_1.isAbortError)(rejection.reason))) {
                    rejection = { reason };
                }
                settled();
            });
        }
    });
}
exports.all = all;
//# sourceMappingURL=all.js.map