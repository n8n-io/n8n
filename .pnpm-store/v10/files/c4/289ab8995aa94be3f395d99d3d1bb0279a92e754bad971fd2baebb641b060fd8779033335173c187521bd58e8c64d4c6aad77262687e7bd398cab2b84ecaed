"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isBrowser = isBrowser;
exports.env = env;
function isBrowser() {
    return (typeof window !== 'undefined' ||
        typeof process === 'undefined' ||
        process?.platform === 'browser'); // main and worker thread
}
function env() {
    return isBrowser() ? {} : process.env || {};
}
//# sourceMappingURL=env.js.map