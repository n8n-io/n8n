import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isLocaleValidator from 'validator/lib/isLocale';
export var IS_LOCALE = 'isLocale';
/**
 * Check if the string is a locale.
 * If given value is not a string, then it returns false.
 */
export function isLocale(value) {
    return typeof value === 'string' && isLocaleValidator(value);
}
/**
 * Check if the string is a locale.
 * If given value is not a string, then it returns false.
 */
export function IsLocale(validationOptions) {
    return ValidateBy({
        name: IS_LOCALE,
        validator: {
            validate: function (value, args) { return isLocale(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be locale'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsLocale.js.map