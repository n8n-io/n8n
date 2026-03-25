import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var ARRAY_UNIQUE = 'arrayUnique';
/**
 * Checks if all array's values are unique. Comparison for objects is reference-based.
 * If null or undefined is given then this function returns false.
 */
export function arrayUnique(array, identifier) {
    if (!Array.isArray(array))
        return false;
    if (identifier) {
        array = array.map(function (o) { return (o != null ? identifier(o) : o); });
    }
    var uniqueItems = array.filter(function (a, b, c) { return c.indexOf(a) === b; });
    return array.length === uniqueItems.length;
}
/**
 * Checks if all array's values are unique. Comparison for objects is reference-based.
 * If null or undefined is given then this function returns false.
 */
export function ArrayUnique(identifierOrOptions, validationOptions) {
    var identifier = typeof identifierOrOptions === 'function' ? identifierOrOptions : undefined;
    var options = typeof identifierOrOptions !== 'function' ? identifierOrOptions : validationOptions;
    return ValidateBy({
        name: ARRAY_UNIQUE,
        validator: {
            validate: function (value, args) { return arrayUnique(value, identifier); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + "All $property's elements must be unique"; }, options),
        },
    }, options);
}
//# sourceMappingURL=ArrayUnique.js.map