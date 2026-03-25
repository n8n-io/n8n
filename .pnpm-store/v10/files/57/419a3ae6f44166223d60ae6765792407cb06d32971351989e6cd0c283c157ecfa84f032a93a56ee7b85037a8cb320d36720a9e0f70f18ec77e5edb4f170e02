"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.now = exports.isPerformanceSupported = void 0;
let supported;
let perf;
function isPerformanceSupported() {
    var _a;
    if (supported !== undefined) {
        return supported;
    }
    if (typeof window !== 'undefined' && window.performance) {
        supported = true;
        perf = window.performance;
    }
    else if (typeof globalThis !== 'undefined' && ((_a = globalThis.perf_hooks) === null || _a === void 0 ? void 0 : _a.performance)) {
        supported = true;
        perf = globalThis.perf_hooks.performance;
    }
    else {
        supported = false;
    }
    return supported;
}
exports.isPerformanceSupported = isPerformanceSupported;
function now() {
    return isPerformanceSupported() ? perf.now() : Date.now();
}
exports.now = now;
