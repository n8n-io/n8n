"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isSerializable = isSerializable;
/**
 * Check if a value is a primitive or plain object created by the Object constructor.
 */
function isSerializablePrimitiveOrPlainObject(val) {
    return (
    // eslint-disable-next-line eqeqeq, @typescript-eslint/internal/eqeq-nullish
    val === null ||
        typeof val === 'string' ||
        typeof val === 'boolean' ||
        typeof val === 'number' ||
        (typeof val === 'object' && val.constructor === Object) ||
        Array.isArray(val));
}
/**
 * Check if a value is serializable.
 * Functions or objects like RegExp cannot be serialized by JSON.stringify().
 * Inspired by: https://stackoverflow.com/questions/30579940/reliable-way-to-check-if-objects-is-serializable-in-javascript
 */
function isSerializable(val) {
    if (!isSerializablePrimitiveOrPlainObject(val)) {
        return false;
    }
    if (typeof val === 'object') {
        const valAsObj = val;
        for (const property in valAsObj) {
            if (Object.hasOwn(valAsObj, property)) {
                if (!isSerializablePrimitiveOrPlainObject(valAsObj[property])) {
                    return false;
                }
                if (typeof valAsObj[property] === 'object' &&
                    !isSerializable(valAsObj[property])) {
                    return false;
                }
            }
        }
    }
    return true;
}
