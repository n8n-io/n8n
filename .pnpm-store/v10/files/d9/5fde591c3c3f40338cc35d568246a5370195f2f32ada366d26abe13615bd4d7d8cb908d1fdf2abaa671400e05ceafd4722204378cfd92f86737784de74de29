"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsNumber = exports.isNumber = exports.IS_NUMBER = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.IS_NUMBER = 'isNumber';
/**
 * Checks if a given value is a number.
 */
function isNumber(value, options = {}) {
    if (typeof value !== 'number') {
        return false;
    }
    if (value === Infinity || value === -Infinity) {
        return !!options.allowInfinity;
    }
    if (Number.isNaN(value)) {
        return !!options.allowNaN;
    }
    if (options.maxDecimalPlaces !== undefined) {
        let decimalPlaces = 0;
        if (value % 1 !== 0) {
            decimalPlaces = value.toString().split('.')[1].length;
        }
        if (decimalPlaces > options.maxDecimalPlaces) {
            return false;
        }
    }
    return Number.isFinite(value);
}
exports.isNumber = isNumber;
/**
 * Checks if a value is a number.
 */
function IsNumber(options = {}, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_NUMBER,
        constraints: [options],
        validator: {
            validate: (value, args) => isNumber(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a number conforming to the specified constraints', validationOptions),
        },
    }, validationOptions);
}
exports.IsNumber = IsNumber;
//# sourceMappingURL=IsNumber.js.map