"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// @ts-nocheck
const isSymbol_js_1 = __importDefault(require("./isSymbol.cjs"));
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
        (0, isSymbol_js_1.default)(value)) {
        return true;
    }
    return (reIsPlainProp.test(value) ||
        !reIsDeepProp.test(value) ||
        (object != null && value in Object(object)));
}
exports.default = isKey;
