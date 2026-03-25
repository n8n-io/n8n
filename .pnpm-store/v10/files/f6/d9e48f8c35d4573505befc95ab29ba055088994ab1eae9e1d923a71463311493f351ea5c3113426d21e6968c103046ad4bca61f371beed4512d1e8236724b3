import { buildMessage, ValidateBy } from '../common/ValidateBy';
export const NOT_EQUALS = 'notEquals';
/**
 * Checks if value does not match ("!==") the comparison.
 */
export function notEquals(value, comparison) {
    return value !== comparison;
}
/**
 * Checks if value does not match ("!==") the comparison.
 */
export function NotEquals(comparison, validationOptions) {
    return ValidateBy({
        name: NOT_EQUALS,
        constraints: [comparison],
        validator: {
            validate: (value, args) => notEquals(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property should not be equal to $constraint1', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=NotEquals.js.map