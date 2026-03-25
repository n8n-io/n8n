"use strict";
// @ts-nocheck
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const isSymbol_js_1 = __importDefault(require("./isSymbol.cjs"));
/** Used as references for various `Number` constants. */
const INFINITY = 1 / 0;
/**
 * Converts `value` to a string key if it's not a string or symbol.
 *
 * @private
 * @param {*} value The value to inspect.
 * @returns {string|symbol} Returns the key.
 */
function toKey(value) {
    if (typeof value === "string" || (0, isSymbol_js_1.default)(value)) {
        return value;
    }
    const result = `${value}`;
    return result === "0" && 1 / value === -INFINITY ? "-0" : result;
}
exports.default = toKey;
