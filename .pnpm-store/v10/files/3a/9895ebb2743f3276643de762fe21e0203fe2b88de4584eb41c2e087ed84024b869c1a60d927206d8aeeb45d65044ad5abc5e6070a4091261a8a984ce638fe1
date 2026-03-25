"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsNotIn = exports.isNotIn = exports.IS_NOT_IN = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.IS_NOT_IN = 'isNotIn';
/**
 * Checks if given value not in a array of allowed values.
 */
function isNotIn(value, possibleValues) {
    return !Array.isArray(possibleValues) || !possibleValues.some(possibleValue => possibleValue === value);
}
exports.isNotIn = isNotIn;
/**
 * Checks if given value not in a array of allowed values.
 */
function IsNotIn(values, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_NOT_IN,
        constraints: [values],
        validator: {
            validate: (value, args) => isNotIn(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property should not be one of the following values: $constraint1', validationOptions),
        },
    }, validationOptions);
}
exports.IsNotIn = IsNotIn;
//# sourceMappingURL=IsNotIn.js.map