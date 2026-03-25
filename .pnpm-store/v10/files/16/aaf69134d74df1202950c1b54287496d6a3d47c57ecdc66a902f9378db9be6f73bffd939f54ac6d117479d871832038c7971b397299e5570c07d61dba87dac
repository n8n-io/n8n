"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const AbortError_1 = require("./AbortError");
/**
 * Invokes an abortable function with implicitly created `AbortSignal`.
 *
 * Returns a function that aborts that signal and waits until passed function
 * finishes.
 *
 * Any error other than `AbortError` thrown from passed function will result in
 * unhandled promise rejection.
 *
 * Example:
 *
 *    const stop = run(async signal => {
 *      try {
 *        while (true) {
 *          await delay(signal, 1000);
 *          console.log('tick');
 *        }
 *      } finally {
 *        await doCleanup();
 *      }
 *    });
 *
 *    // abort and wait until cleanup is done
 *    await stop();
 */
function run(fn) {
    const abortController = new AbortController();
    const promise = fn(abortController.signal).catch(AbortError_1.catchAbortError);
    return () => {
        abortController.abort();
        return promise;
    };
}
exports.run = run;
//# sourceMappingURL=run.js.map