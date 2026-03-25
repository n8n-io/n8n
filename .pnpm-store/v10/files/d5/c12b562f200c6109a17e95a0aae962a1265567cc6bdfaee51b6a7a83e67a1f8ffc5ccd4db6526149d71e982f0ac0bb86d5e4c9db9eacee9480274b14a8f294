import { buildMessage, ValidateBy } from '../common/ValidateBy';
export const IS_IN = 'isIn';
/**
 * Checks if given value is in a array of allowed values.
 */
export function isIn(value, possibleValues) {
    return !Array.isArray(possibleValues) || possibleValues.some(possibleValue => possibleValue === value);
}
/**
 * Checks if given value is in a array of allowed values.
 */
export function IsIn(values, validationOptions) {
    return ValidateBy({
        name: IS_IN,
        constraints: [values],
        validator: {
            validate: (value, args) => isIn(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be one of the following values: $constraint1', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsIn.js.map