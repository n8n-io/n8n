export function isPromiseMethod(x) {
    if (x === "then" || x === "catch" || x === "finally") {
        return true;
    }
    return false;
}
export function isKVMap(x) {
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
export const isAsyncIterable = (x) => x != null &&
    typeof x === "object" &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof x[Symbol.asyncIterator] === "function";
export const isIteratorLike = (x) => x != null &&
    typeof x === "object" &&
    "next" in x &&
    typeof x.next === "function";
const GeneratorFunction = function* () { }.constructor;
export const isGenerator = (x) => 
// eslint-disable-next-line no-instanceof/no-instanceof
x != null && typeof x === "function" && x instanceof GeneratorFunction;
export const isThenable = (x) => x != null &&
    typeof x === "object" &&
    "then" in x &&
    typeof x.then === "function";
export const isReadableStream = (x) => x != null &&
    typeof x === "object" &&
    "getReader" in x &&
    typeof x.getReader === "function";
