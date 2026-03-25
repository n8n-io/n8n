import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isPostalCodeValidator from 'validator/lib/isPostalCode';
export var IS_POSTAL_CODE = 'isPostalCode';
/**
 * Check if the string is a postal code, in the specified locale.
 * If given value is not a string, then it returns false.
 */
export function isPostalCode(value, locale) {
    return typeof value === 'string' && isPostalCodeValidator(value, locale);
}
/**
 * Check if the string is a postal code, in the specified locale.
 * If given value is not a string, then it returns false.
 */
export function IsPostalCode(locale, validationOptions) {
    return ValidateBy({
        name: IS_POSTAL_CODE,
        constraints: [locale],
        validator: {
            validate: function (value, args) { return isPostalCode(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a postal code'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsPostalCode.js.map