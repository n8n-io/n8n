"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNumberProperty = getNumberProperty;
exports.isIterable = isIterable;
/**
 * Gets a number property from an object.
 * @internal
 */
function getNumberProperty(obj, key) {
    if (!obj || typeof obj !== "object" || !(key in obj)) {
        return undefined;
    }
    const value = Reflect.get(obj, key);
    return typeof value === "number" ? value : undefined;
}
/**
 * Checks if a value is iterable.
 * @internal
 */
function isIterable(value) {
    return (typeof value === "object" &&
        value !== null &&
        typeof value[Symbol.iterator] === "function");
}
