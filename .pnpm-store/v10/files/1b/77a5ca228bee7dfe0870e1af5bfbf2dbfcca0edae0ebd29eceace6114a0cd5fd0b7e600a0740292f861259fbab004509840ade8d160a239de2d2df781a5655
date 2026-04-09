"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueMicrotask = void 0;
// queueMicrotask() ponyfill
// https://github.com/libsql/libsql-client-ts/issues/47
let _queueMicrotask;
if (typeof queueMicrotask !== "undefined") {
    exports.queueMicrotask = _queueMicrotask = queueMicrotask;
}
else {
    const resolved = Promise.resolve();
    exports.queueMicrotask = _queueMicrotask = (callback) => {
        resolved.then(callback);
    };
}
