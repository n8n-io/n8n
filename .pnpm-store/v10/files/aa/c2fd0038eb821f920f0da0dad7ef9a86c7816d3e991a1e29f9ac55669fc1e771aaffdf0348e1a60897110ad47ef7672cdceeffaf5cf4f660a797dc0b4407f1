"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotEquals = exports.notEquals = exports.NOT_EQUALS = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.NOT_EQUALS = 'notEquals';
/**
 * Checks if value does not match ("!==") the comparison.
 */
function notEquals(value, comparison) {
    return value !== comparison;
}
exports.notEquals = notEquals;
/**
 * Checks if value does not match ("!==") the comparison.
 */
function NotEquals(comparison, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.NOT_EQUALS,
        constraints: [comparison],
        validator: {
            validate: (value, args) => notEquals(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property should not be equal to $constraint1', validationOptions),
        },
    }, validationOptions);
}
exports.NotEquals = NotEquals;
//# sourceMappingURL=NotEquals.js.map