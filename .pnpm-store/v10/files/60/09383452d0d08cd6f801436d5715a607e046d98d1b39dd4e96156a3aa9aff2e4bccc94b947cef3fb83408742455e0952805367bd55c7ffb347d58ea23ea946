import { buildMessage, ValidateBy } from '../common/ValidateBy';
export const ARRAY_NOT_CONTAINS = 'arrayNotContains';
/**
 * Checks if array does not contain any of the given values.
 * If null or undefined is given then this function returns false.
 */
export function arrayNotContains(array, values) {
    if (!Array.isArray(array))
        return false;
    return values.every(value => array.indexOf(value) === -1);
}
/**
 * Checks if array does not contain any of the given values.
 * If null or undefined is given then this function returns false.
 */
export function ArrayNotContains(values, validationOptions) {
    return ValidateBy({
        name: ARRAY_NOT_CONTAINS,
        constraints: [values],
        validator: {
            validate: (value, args) => arrayNotContains(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property should not contain $constraint1 values', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=ArrayNotContains.js.map