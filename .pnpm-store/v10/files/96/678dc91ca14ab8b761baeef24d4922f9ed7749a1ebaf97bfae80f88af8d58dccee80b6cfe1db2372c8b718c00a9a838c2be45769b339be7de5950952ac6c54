"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArrayMinSize = exports.arrayMinSize = exports.ARRAY_MIN_SIZE = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.ARRAY_MIN_SIZE = 'arrayMinSize';
/**
 * Checks if the array's length is greater than or equal to the specified number.
 * If null or undefined is given then this function returns false.
 */
function arrayMinSize(array, min) {
    return Array.isArray(array) && array.length >= min;
}
exports.arrayMinSize = arrayMinSize;
/**
 * Checks if the array's length is greater than or equal to the specified number.
 * If null or undefined is given then this function returns false.
 */
function ArrayMinSize(min, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.ARRAY_MIN_SIZE,
        constraints: [min],
        validator: {
            validate: (value, args) => arrayMinSize(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must contain at least $constraint1 elements', validationOptions),
        },
    }, validationOptions);
}
exports.ArrayMinSize = ArrayMinSize;
//# sourceMappingURL=ArrayMinSize.js.map