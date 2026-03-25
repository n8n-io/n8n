"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const baseAssignValue_js_1 = __importDefault(require("./baseAssignValue.cjs"));
const eq_js_1 = __importDefault(require("./eq.cjs"));
/** Used to check objects for own properties. */
const hasOwnProperty = Object.prototype.hasOwnProperty;
/**
 * Assigns `value` to `key` of `object` if the existing value is not equivalent.
 *
 * @private
 * @param {Object} object The object to modify.
 * @param {string} key The key of the property to assign.
 * @param {*} value The value to assign.
 */
function assignValue(object, key, value) {
    const objValue = object[key];
    if (!(hasOwnProperty.call(object, key) && (0, eq_js_1.default)(objValue, value))) {
        if (value !== 0 || 1 / value === 1 / objValue) {
            (0, baseAssignValue_js_1.default)(object, key, value);
        }
    }
    else if (value === undefined && !(key in object)) {
        (0, baseAssignValue_js_1.default)(object, key, value);
    }
}
exports.default = assignValue;
