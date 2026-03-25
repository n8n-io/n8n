/**
 * Gets a number property from an object.
 * @internal
 */
export function getNumberProperty(obj, key) {
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
export function isIterable(value) {
    return (typeof value === "object" &&
        value !== null &&
        typeof value[Symbol.iterator] === "function");
}
