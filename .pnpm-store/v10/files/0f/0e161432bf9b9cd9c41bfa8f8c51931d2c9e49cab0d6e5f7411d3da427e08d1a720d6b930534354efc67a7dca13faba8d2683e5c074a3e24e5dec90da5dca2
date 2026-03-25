"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsPositive = exports.isPositive = exports.IS_POSITIVE = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.IS_POSITIVE = 'isPositive';
/**
 * Checks if the value is a positive number greater than zero.
 */
function isPositive(value) {
    return typeof value === 'number' && value > 0;
}
exports.isPositive = isPositive;
/**
 * Checks if the value is a positive number greater than zero.
 */
function IsPositive(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_POSITIVE,
        validator: {
            validate: (value, args) => isPositive(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a positive number', validationOptions),
        },
    }, validationOptions);
}
exports.IsPositive = IsPositive;
//# sourceMappingURL=IsPositive.js.map