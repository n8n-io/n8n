"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const isKey_js_1 = __importDefault(require("./isKey.cjs"));
const stringToPath_js_1 = __importDefault(require("./stringToPath.cjs"));
/**
 * Casts `value` to a path array if it's not one.
 *
 * @private
 * @param {*} value The value to inspect.
 * @param {Object} [object] The object to query keys on.
 * @returns {Array} Returns the cast property path array.
 */
function castPath(value, object) {
    if (Array.isArray(value)) {
        return value;
    }
    return (0, isKey_js_1.default)(value, object) ? [value] : (0, stringToPath_js_1.default)(value);
}
exports.default = castPath;
