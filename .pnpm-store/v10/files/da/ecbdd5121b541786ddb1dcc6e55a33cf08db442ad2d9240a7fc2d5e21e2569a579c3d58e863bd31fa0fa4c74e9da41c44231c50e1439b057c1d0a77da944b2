"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isReadableStream = exports.isThenable = exports.isGenerator = exports.isIteratorLike = exports.isAsyncIterable = void 0;
exports.isPromiseMethod = isPromiseMethod;
exports.isKVMap = isKVMap;
function isPromiseMethod(x) {
    if (x === "then" || x === "catch" || x === "finally") {
        return true;
    }
    return false;
}
function isKVMap(x) {
    if (typeof x !== "object" || x == null) {
        return false;
    }
    const prototype = Object.getPrototypeOf(x);
    return ((prototype === null ||
        prototype === Object.prototype ||
        Object.getPrototypeOf(prototype) === null) &&
        !(Symbol.toStringTag in x) &&
        !(Symbol.iterator in x));
}
const isAsyncIterable = (x) => x != null &&
    typeof x === "object" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof x[Symbol.asyncIterator] === "function";
exports.isAsyncIterable = isAsyncIterable;
const isIteratorLike = (x) => x != null &&
    typeof x === "object" &&
    "next" in x &&
    typeof x.next === "function";
exports.isIteratorLike = isIteratorLike;
const GeneratorFunction = function* () { }.constructor;
const isGenerator = (x) => 
// eslint-disable-next-line no-instanceof/no-instanceof
x != null && typeof x === "function" && x instanceof GeneratorFunction;
exports.isGenerator = isGenerator;
const isThenable = (x) => x != null &&
    typeof x === "object" &&
    "then" in x &&
    typeof x.then === "function";
exports.isThenable = isThenable;
const isReadableStream = (x) => x != null &&
    typeof x === "object" &&
    "getReader" in x &&
    typeof x.getReader === "function";
exports.isReadableStream = isReadableStream;
