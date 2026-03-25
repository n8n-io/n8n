import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isMultibyteValidator from 'validator/lib/isMultibyte';
export var IS_MULTIBYTE = 'isMultibyte';
/**
 * Checks if the string contains one or more multibyte chars.
 * If given value is not a string, then it returns false.
 */
export function isMultibyte(value) {
    return typeof value === 'string' && isMultibyteValidator(value);
}
/**
 * Checks if the string contains one or more multibyte chars.
 * If given value is not a string, then it returns false.
 */
export function IsMultibyte(validationOptions) {
    return ValidateBy({
        name: IS_MULTIBYTE,
        validator: {
            validate: function (value, args) { return isMultibyte(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must contain one or more multibyte chars'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsMultibyte.js.map