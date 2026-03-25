import { buildMessage, ValidateBy } from '../common/ValidateBy';
export const EQUALS = 'equals';
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
            validate: (value, args) => equals(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be equal to $constraint1', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=Equals.js.map