import { buildMessage, ValidateBy } from '../common/ValidateBy';
export const ARRAY_UNIQUE = 'arrayUnique';
/**
 * Checks if all array's values are unique. Comparison for objects is reference-based.
 * If null or undefined is given then this function returns false.
 */
export function arrayUnique(array, identifier) {
    if (!Array.isArray(array))
        return false;
    if (identifier) {
        array = array.map(o => (o != null ? identifier(o) : o));
    }
    const uniqueItems = array.filter((a, b, c) => c.indexOf(a) === b);
    return array.length === uniqueItems.length;
}
/**
 * Checks if all array's values are unique. Comparison for objects is reference-based.
 * If null or undefined is given then this function returns false.
 */
export function ArrayUnique(identifierOrOptions, validationOptions) {
    const identifier = typeof identifierOrOptions === 'function' ? identifierOrOptions : undefined;
    const options = typeof identifierOrOptions !== 'function' ? identifierOrOptions : validationOptions;
    return ValidateBy({
        name: ARRAY_UNIQUE,
        validator: {
            validate: (value, args) => arrayUnique(value, identifier),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + "All $property's elements must be unique", options),
        },
    }, options);
}
//# sourceMappingURL=ArrayUnique.js.map