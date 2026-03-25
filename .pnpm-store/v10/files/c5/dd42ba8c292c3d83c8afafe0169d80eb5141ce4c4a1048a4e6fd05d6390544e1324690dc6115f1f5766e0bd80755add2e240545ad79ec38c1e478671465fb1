'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.fallback = fallback;
exports.wrap = wrap;
/* istanbul ignore file */

var hasQueueMicrotask = exports.hasQueueMicrotask = typeof queueMicrotask === 'function' && queueMicrotask;
var hasSetImmediate = exports.hasSetImmediate = typeof setImmediate === 'function' && setImmediate;
var hasNextTick = exports.hasNextTick = typeof process === 'object' && typeof process.nextTick === 'function';

function fallback(fn) {
    setTimeout(fn, 0);
}

function wrap(defer) {
    return (fn, ...args) => defer(() => fn(...args));
}

var _defer;

if (hasQueueMicrotask) {
    _defer = queueMicrotask;
} else if (hasSetImmediate) {
    _defer = setImmediate;
} else if (hasNextTick) {
    _defer = process.nextTick;
} else {
    _defer = fallback;
}

exports.default = wrap(_defer);