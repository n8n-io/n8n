"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.anySignal = exports.getTimeoutSignal = void 0;
const TIMEOUT = "timeout";
function getTimeoutSignal(timeoutMs) {
    const controller = new AbortController();
    const abortId = setTimeout(() => controller.abort(TIMEOUT), timeoutMs);
    return { signal: controller.signal, abortId };
}
exports.getTimeoutSignal = getTimeoutSignal;
/**
 * Returns an abort signal that is getting aborted when
 * at least one of the specified abort signals is aborted.
 *
 * Requires at least node.js 18.
 */
function anySignal(...args) {
    // Allowing signals to be passed either as array
    // of signals or as multiple arguments.
    const signals = (args.length === 1 && Array.isArray(args[0]) ? args[0] : args);
    const controller = new AbortController();
    for (const signal of signals) {
        if (signal.aborted) {
            // Exiting early if one of the signals
            // is already aborted.
            controller.abort(signal === null || signal === void 0 ? void 0 : signal.reason);
            break;
        }
        // Listening for signals and removing the listeners
        // when at least one symbol is aborted.
        signal.addEventListener("abort", () => controller.abort(signal === null || signal === void 0 ? void 0 : signal.reason), {
            signal: controller.signal,
        });
    }
    return controller.signal;
}
exports.anySignal = anySignal;
