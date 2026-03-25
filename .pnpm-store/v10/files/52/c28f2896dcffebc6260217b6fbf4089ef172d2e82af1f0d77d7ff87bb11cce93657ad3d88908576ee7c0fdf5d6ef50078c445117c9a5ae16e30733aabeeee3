"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.abortable = void 0;
const execute_1 = require("./execute");
/**
 * Wrap a promise to reject with `AbortError` once `signal` is aborted.
 *
 * Useful to wrap non-abortable promises.
 * Note that underlying process will NOT be aborted.
 */
function abortable(signal, promise) {
    if (signal.aborted) {
        // prevent unhandled rejection
        const noop = () => { };
        promise.then(noop, noop);
    }
    return (0, execute_1.execute)(signal, (resolve, reject) => {
        promise.then(resolve, reject);
        return () => { };
    });
}
exports.abortable = abortable;
//# sourceMappingURL=abortable.js.map