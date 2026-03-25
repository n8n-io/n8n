"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isReactNativeBrowser = exports.isWebWorker = void 0;
const isStandardBrowserEnv = () => {
    var _a;
    if (typeof window !== 'undefined') {
        const electronRenderCheck = typeof navigator !== 'undefined' &&
            ((_a = navigator.userAgent) === null || _a === void 0 ? void 0 : _a.toLowerCase().indexOf(' electron/')) > -1;
        if (electronRenderCheck && (process === null || process === void 0 ? void 0 : process.versions)) {
            const electronMainCheck = Object.prototype.hasOwnProperty.call(process.versions, 'electron');
            return !electronMainCheck;
        }
        return typeof window.document !== 'undefined';
    }
    return false;
};
const isWebWorkerEnv = () => {
    var _a, _b;
    return Boolean(typeof self === 'object' &&
        ((_b = (_a = self === null || self === void 0 ? void 0 : self.constructor) === null || _a === void 0 ? void 0 : _a.name) === null || _b === void 0 ? void 0 : _b.includes('WorkerGlobalScope')));
};
const isReactNativeEnv = () => typeof navigator !== 'undefined' && navigator.product === 'ReactNative';
const isBrowser = isStandardBrowserEnv() || isWebWorkerEnv() || isReactNativeEnv();
exports.isWebWorker = isWebWorkerEnv();
exports.isReactNativeBrowser = isReactNativeEnv();
exports.default = isBrowser;
//# sourceMappingURL=is-browser.js.map