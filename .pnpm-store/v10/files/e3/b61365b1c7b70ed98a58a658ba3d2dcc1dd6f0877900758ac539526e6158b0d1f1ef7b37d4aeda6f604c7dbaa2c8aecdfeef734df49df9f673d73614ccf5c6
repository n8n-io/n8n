"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unsharedSlice = exports.sleepBreakIf = exports.postMsg = exports.isMainThread = exports.wrapInstanceExports = exports.isPromiseLike = exports.validateInt32 = exports.validateUndefined = exports.validateFunction = exports.validateString = exports.validateBoolean = exports.validateArray = exports.validateObject = void 0;
/* eslint-disable spaced-comment */
function validateObject(value, name) {
    if (value === null || typeof value !== 'object') {
        throw new TypeError(`${name} must be an object. Received ${value === null ? 'null' : typeof value}`);
    }
}
exports.validateObject = validateObject;
function validateArray(value, name) {
    if (!Array.isArray(value)) {
        throw new TypeError(`${name} must be an array. Received ${value === null ? 'null' : typeof value}`);
    }
}
exports.validateArray = validateArray;
function validateBoolean(value, name) {
    if (typeof value !== 'boolean') {
        throw new TypeError(`${name} must be a boolean. Received ${value === null ? 'null' : typeof value}`);
    }
}
exports.validateBoolean = validateBoolean;
function validateString(value, name) {
    if (typeof value !== 'string') {
        throw new TypeError(`${name} must be a string. Received ${value === null ? 'null' : typeof value}`);
    }
}
exports.validateString = validateString;
function validateFunction(value, name) {
    if (typeof value !== 'function') {
        throw new TypeError(`${name} must be a function. Received ${value === null ? 'null' : typeof value}`);
    }
}
exports.validateFunction = validateFunction;
function validateUndefined(value, name) {
    if (value !== undefined) {
        throw new TypeError(`${name} must be undefined. Received ${value === null ? 'null' : typeof value}`);
    }
}
exports.validateUndefined = validateUndefined;
function validateInt32(value, name, min = -2147483648, max = 2147483647) {
    if (typeof value !== 'number') {
        throw new TypeError(`${name} must be a number. Received ${value === null ? 'null' : typeof value}`);
    }
    if (!Number.isInteger(value)) {
        throw new RangeError(`${name} must be a integer.`);
    }
    if (value < min || value > max) {
        throw new RangeError(`${name} must be >= ${min} && <= ${max}. Received ${value}`);
    }
}
exports.validateInt32 = validateInt32;
function isPromiseLike(obj) {
    return !!(obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function');
}
exports.isPromiseLike = isPromiseLike;
function wrapInstanceExports(exports, mapFn) {
    const newExports = Object.create(null);
    Object.keys(exports).forEach(name => {
        const exportValue = exports[name];
        Object.defineProperty(newExports, name, {
            enumerable: true,
            value: mapFn(exportValue, name)
        });
    });
    return newExports;
}
exports.wrapInstanceExports = wrapInstanceExports;
const _require = /*#__PURE__*/ (function () {
    let nativeRequire;
    if (typeof __webpack_public_path__ !== 'undefined') {
        nativeRequire = (function () {
            return typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : undefined;
        })();
    }
    else {
        nativeRequire = (function () {
            return typeof __webpack_public_path__ !== 'undefined' ? (typeof __non_webpack_require__ !== 'undefined' ? __non_webpack_require__ : undefined) : (typeof require !== 'undefined' ? require : undefined);
        })();
    }
    return nativeRequire;
})();
exports.isMainThread = (function () {
    let worker_threads;
    try {
        worker_threads = _require('worker_threads');
    }
    catch (_) { }
    if (!worker_threads) {
        return typeof importScripts === 'undefined';
    }
    return worker_threads.isMainThread;
})();
exports.postMsg = exports.isMainThread
    ? () => { }
    : /*#__PURE__*/ (function () {
        let worker_threads;
        try {
            worker_threads = _require('worker_threads');
        }
        catch (_) { }
        if (!worker_threads) {
            return postMessage;
        }
        return function postMessage(data) {
            worker_threads.parentPort.postMessage({ data });
        };
    })();
function sleepBreakIf(delay, breakIf) {
    const start = Date.now();
    const end = start + delay;
    let ret = false;
    while (Date.now() < end) {
        if (breakIf()) {
            ret = true;
            break;
        }
    }
    return ret;
}
exports.sleepBreakIf = sleepBreakIf;
function unsharedSlice(view, start, end) {
    return ((typeof SharedArrayBuffer === 'function' && view.buffer instanceof SharedArrayBuffer) || (Object.prototype.toString.call(view.buffer.constructor) === '[object SharedArrayBuffer]'))
        ? view.slice(start, end)
        : view.subarray(start, end);
}
exports.unsharedSlice = unsharedSlice;
//# sourceMappingURL=util.js.map