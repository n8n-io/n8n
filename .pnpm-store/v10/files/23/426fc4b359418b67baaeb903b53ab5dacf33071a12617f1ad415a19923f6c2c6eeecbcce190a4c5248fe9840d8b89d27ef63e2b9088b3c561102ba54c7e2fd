import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var IS_NOT_EMPTY = 'isNotEmpty';
/**
 * Checks if given value is not empty (!== '', !== null, !== undefined).
 */
export function isNotEmpty(value) {
    return value !== '' && value !== null && value !== undefined;
}
/**
 * Checks if given value is not empty (!== '', !== null, !== undefined).
 */
export function IsNotEmpty(validationOptions) {
    return ValidateBy({
        name: IS_NOT_EMPTY,
        validator: {
            validate: function (value, args) { return isNotEmpty(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property should not be empty'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsNotEmpty.js.map