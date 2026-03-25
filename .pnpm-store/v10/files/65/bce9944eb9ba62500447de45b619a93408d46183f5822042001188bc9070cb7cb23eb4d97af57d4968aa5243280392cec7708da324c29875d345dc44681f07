"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayContains = exports.arrayContains = exports.ARRAY_CONTAINS = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.ARRAY_CONTAINS = 'arrayContains';
/**
 * Checks if array contains all values from the given array of values.
 * If null or undefined is given then this function returns false.
 */
function arrayContains(array, values) {
    if (!Array.isArray(array))
        return false;
    return values.every(value => array.indexOf(value) !== -1);
}
exports.arrayContains = arrayContains;
/**
 * Checks if array contains all values from the given array of values.
 * If null or undefined is given then this function returns false.
 */
function ArrayContains(values, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.ARRAY_CONTAINS,
        constraints: [values],
        validator: {
            validate: (value, args) => arrayContains(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must contain $constraint1 values', validationOptions),
        },
    }, validationOptions);
}
exports.ArrayContains = ArrayContains;
//# sourceMappingURL=ArrayContains.js.map