import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var ARRAY_NOT_EMPTY = 'arrayNotEmpty';
/**
 * Checks if given array is not empty.
 * If null or undefined is given then this function returns false.
 */
export function arrayNotEmpty(array) {
    return Array.isArray(array) && array.length > 0;
}
/**
 * Checks if given array is not empty.
 * If null or undefined is given then this function returns false.
 */
export function ArrayNotEmpty(validationOptions) {
    return ValidateBy({
        name: ARRAY_NOT_EMPTY,
        validator: {
            validate: function (value, args) { return arrayNotEmpty(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property should not be empty'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=ArrayNotEmpty.js.map