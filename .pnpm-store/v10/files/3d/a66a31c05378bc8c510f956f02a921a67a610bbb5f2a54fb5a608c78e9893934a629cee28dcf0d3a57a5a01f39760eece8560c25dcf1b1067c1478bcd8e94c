import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isISO4217Validator from 'validator/lib/isISO4217';
export var IS_ISO4217_CURRENCY_CODE = 'isISO4217CurrencyCode';
/**
 * Check if the string is a valid [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) officially assigned currency code.
 */
export function isISO4217CurrencyCode(value) {
    return typeof value === 'string' && isISO4217Validator(value);
}
/**
 * Check if the string is a valid [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) officially assigned currency code.
 */
export function IsISO4217CurrencyCode(validationOptions) {
    return ValidateBy({
        name: IS_ISO4217_CURRENCY_CODE,
        validator: {
            validate: function (value, args) { return isISO4217CurrencyCode(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a valid ISO4217 currency code'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=is-iso4217-currency-code.js.map