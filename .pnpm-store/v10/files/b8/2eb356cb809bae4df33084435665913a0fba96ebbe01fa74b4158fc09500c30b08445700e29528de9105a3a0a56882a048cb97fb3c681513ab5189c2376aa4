"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayUnique = exports.arrayUnique = exports.ARRAY_UNIQUE = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.ARRAY_UNIQUE = 'arrayUnique';
/**
 * Checks if all array's values are unique. Comparison for objects is reference-based.
 * If null or undefined is given then this function returns false.
 */
function arrayUnique(array, identifier) {
    if (!Array.isArray(array))
        return false;
    if (identifier) {
        array = array.map(o => (o != null ? identifier(o) : o));
    }
    const uniqueItems = array.filter((a, b, c) => c.indexOf(a) === b);
    return array.length === uniqueItems.length;
}
exports.arrayUnique = arrayUnique;
/**
 * Checks if all array's values are unique. Comparison for objects is reference-based.
 * If null or undefined is given then this function returns false.
 */
function ArrayUnique(identifierOrOptions, validationOptions) {
    const identifier = typeof identifierOrOptions === 'function' ? identifierOrOptions : undefined;
    const options = typeof identifierOrOptions !== 'function' ? identifierOrOptions : validationOptions;
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.ARRAY_UNIQUE,
        validator: {
            validate: (value, args) => arrayUnique(value, identifier),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + "All $property's elements must be unique", options),
        },
    }, options);
}
exports.ArrayUnique = ArrayUnique;
//# sourceMappingURL=ArrayUnique.js.map