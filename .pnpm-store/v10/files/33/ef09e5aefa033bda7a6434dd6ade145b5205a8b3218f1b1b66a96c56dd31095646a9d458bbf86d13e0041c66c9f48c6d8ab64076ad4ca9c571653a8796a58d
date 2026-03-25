"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.proxySignals = void 0;
const all_signals_js_1 = require("./all-signals.js");
/**
 * Starts forwarding signals to `child` through `parent`.
 */
const proxySignals = (child) => {
    const listeners = new Map();
    for (const sig of all_signals_js_1.allSignals) {
        const listener = () => {
            // some signals can only be received, not sent
            try {
                child.kill(sig);
                /* c8 ignore start */
            }
            catch (_) { }
            /* c8 ignore stop */
        };
        try {
            // if it's a signal this system doesn't recognize, skip it
            process.on(sig, listener);
            listeners.set(sig, listener);
            /* c8 ignore start */
        }
        catch (_) { }
        /* c8 ignore stop */
    }
    const unproxy = () => {
        for (const [sig, listener] of listeners) {
            process.removeListener(sig, listener);
        }
    };
    child.on('exit', unproxy);
    return unproxy;
};
exports.proxySignals = proxySignals;
//# sourceMappingURL=proxy-signals.js.map