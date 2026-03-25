import { buildMessage, ValidateBy } from '../common/ValidateBy';
export const ARRAY_CONTAINS = 'arrayContains';
/**
 * Checks if array contains all values from the given array of values.
 * If null or undefined is given then this function returns false.
 */
export function arrayContains(array, values) {
    if (!Array.isArray(array))
        return false;
    return values.every(value => array.indexOf(value) !== -1);
}
/**
 * Checks if array contains all values from the given array of values.
 * If null or undefined is given then this function returns false.
 */
export function ArrayContains(values, validationOptions) {
    return ValidateBy({
        name: ARRAY_CONTAINS,
        constraints: [values],
        validator: {
            validate: (value, args) => arrayContains(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must contain $constraint1 values', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=ArrayContains.js.map