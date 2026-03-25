import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var EQUALS = 'equals';
/**
 * Checks if value matches ("===") the comparison.
 */
export function equals(value, comparison) {
    return value === comparison;
}
/**
 * Checks if value matches ("===") the comparison.
 */
export function Equals(comparison, validationOptions) {
    return ValidateBy({
        name: EQUALS,
        constraints: [comparison],
        validator: {
            validate: function (value, args) { return equals(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be equal to $constraint1'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=Equals.js.map