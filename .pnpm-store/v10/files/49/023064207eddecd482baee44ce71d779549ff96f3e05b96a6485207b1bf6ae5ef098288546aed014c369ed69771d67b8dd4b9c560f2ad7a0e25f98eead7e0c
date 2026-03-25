"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsNegative = exports.isNegative = exports.IS_NEGATIVE = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.IS_NEGATIVE = 'isNegative';
/**
 * Checks if the value is a negative number smaller than zero.
 */
function isNegative(value) {
    return typeof value === 'number' && value < 0;
}
exports.isNegative = isNegative;
/**
 * Checks if the value is a negative number smaller than zero.
 */
function IsNegative(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_NEGATIVE,
        validator: {
            validate: (value, args) => isNegative(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a negative number', validationOptions),
        },
    }, validationOptions);
}
exports.IsNegative = IsNegative;
//# sourceMappingURL=IsNegative.js.map