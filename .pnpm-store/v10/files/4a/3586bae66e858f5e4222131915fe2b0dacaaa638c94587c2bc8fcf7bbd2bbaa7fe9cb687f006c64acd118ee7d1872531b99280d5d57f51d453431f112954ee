"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayNotContains = exports.arrayNotContains = exports.ARRAY_NOT_CONTAINS = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.ARRAY_NOT_CONTAINS = 'arrayNotContains';
/**
 * Checks if array does not contain any of the given values.
 * If null or undefined is given then this function returns false.
 */
function arrayNotContains(array, values) {
    if (!Array.isArray(array))
        return false;
    return values.every(value => array.indexOf(value) === -1);
}
exports.arrayNotContains = arrayNotContains;
/**
 * Checks if array does not contain any of the given values.
 * If null or undefined is given then this function returns false.
 */
function ArrayNotContains(values, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.ARRAY_NOT_CONTAINS,
        constraints: [values],
        validator: {
            validate: (value, args) => arrayNotContains(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property should not contain $constraint1 values', validationOptions),
        },
    }, validationOptions);
}
exports.ArrayNotContains = ArrayNotContains;
//# sourceMappingURL=ArrayNotContains.js.map