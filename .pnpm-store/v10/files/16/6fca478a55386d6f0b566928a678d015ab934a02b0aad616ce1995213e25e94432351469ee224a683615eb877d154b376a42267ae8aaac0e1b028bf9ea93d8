// @ts-nocheck
import isSymbol from "./isSymbol.js";
/** Used to match property names within property paths. */
const reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/;
const reIsPlainProp = /^\w*$/;
/**
 * Checks if `value` is a property name and not a property path.
 *
 * @private
 * @param {*} value The value to check.
 * @param {Object} [object] The object to query keys on.
 * @returns {boolean} Returns `true` if `value` is a property name, else `false`.
 */
function isKey(value, object) {
    if (Array.isArray(value)) {
        return false;
    }
    const type = typeof value;
    if (type === "number" ||
        type === "boolean" ||
        value == null ||
        isSymbol(value)) {
        return true;
    }
    return (reIsPlainProp.test(value) ||
        !reIsDeepProp.test(value) ||
        (object != null && value in Object(object)));
}
export default isKey;
