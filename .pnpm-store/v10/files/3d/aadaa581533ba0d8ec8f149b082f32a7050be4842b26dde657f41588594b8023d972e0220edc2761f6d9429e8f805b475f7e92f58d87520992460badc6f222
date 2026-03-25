"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Memoize = void 0;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
var cacheProp = Symbol.for('[memoize]');
/**
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function Memoize(keyBuilder) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function (_, propertyKey, descriptor) {
        if (descriptor.value != null) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            descriptor.value = memoize(propertyKey, descriptor.value, keyBuilder || (function (v) { return v; }));
        }
        else if (descriptor.get != null) {
            descriptor.get = memoize(propertyKey, descriptor.get, keyBuilder || (function () { return propertyKey; }));
        }
    };
}
exports.Memoize = Memoize;
// See https://github.com/microsoft/TypeScript/issues/1863#issuecomment-579541944
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ensureCache(target, reset) {
    if (reset === void 0) { reset = false; }
    if (reset || !target[cacheProp]) {
        Object.defineProperty(target, cacheProp, {
            value: Object.create(null),
            configurable: true,
        });
    }
    return target[cacheProp];
}
// See https://github.com/microsoft/TypeScript/issues/1863#issuecomment-579541944
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ensureChildCache(target, key, reset) {
    if (reset === void 0) { reset = false; }
    var dict = ensureCache(target);
    if (reset || !dict[key]) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        dict[key] = new Map();
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return dict[key];
}
function memoize(namespace, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
func, 
// eslint-disable-next-line @typescript-eslint/no-explicit-any
keyBuilder) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        var cache = ensureChildCache(this, namespace);
        var key = keyBuilder.apply(this, args);
        if (cache.has(key))
            return cache.get(key);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        var res = func.apply(this, args);
        cache.set(key, res);
        return res;
    };
}
