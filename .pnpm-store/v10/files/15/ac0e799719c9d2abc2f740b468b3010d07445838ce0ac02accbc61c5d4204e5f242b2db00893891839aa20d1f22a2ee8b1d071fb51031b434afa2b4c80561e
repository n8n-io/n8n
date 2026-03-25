"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Min = exports.min = exports.MIN = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.MIN = 'min';
/**
 * Checks if the first number is greater than or equal to the second.
 */
function min(num, min) {
    return typeof num === 'number' && typeof min === 'number' && num >= min;
}
exports.min = min;
/**
 * Checks if the value is greater than or equal to the allowed minimum value.
 */
function Min(minValue, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.MIN,
        constraints: [minValue],
        validator: {
            validate: (value, args) => min(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must not be less than $constraint1', validationOptions),
        },
    }, validationOptions);
}
exports.Min = Min;
//# sourceMappingURL=Min.js.map