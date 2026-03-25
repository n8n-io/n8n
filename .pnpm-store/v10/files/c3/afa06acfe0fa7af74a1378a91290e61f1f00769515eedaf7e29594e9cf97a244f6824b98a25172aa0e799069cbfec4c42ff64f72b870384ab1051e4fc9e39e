import { buildMessage, ValidateBy } from '../common/ValidateBy';
export const IS_NOT_IN = 'isNotIn';
/**
 * Checks if given value not in a array of allowed values.
 */
export function isNotIn(value, possibleValues) {
    return !Array.isArray(possibleValues) || !possibleValues.some(possibleValue => possibleValue === value);
}
/**
 * Checks if given value not in a array of allowed values.
 */
export function IsNotIn(values, validationOptions) {
    return ValidateBy({
        name: IS_NOT_IN,
        constraints: [values],
        validator: {
            validate: (value, args) => isNotIn(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property should not be one of the following values: $constraint1', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsNotIn.js.map