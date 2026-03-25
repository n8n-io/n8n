import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isCurrencyValidator from 'validator/lib/isCurrency';
export var IS_CURRENCY = 'isCurrency';
/**
 * Checks if the string is a valid currency amount.
 * If given value is not a string, then it returns false.
 */
export function isCurrency(value, options) {
    return typeof value === 'string' && isCurrencyValidator(value, options);
}
/**
 * Checks if the string is a valid currency amount.
 * If given value is not a string, then it returns false.
 */
export function IsCurrency(options, validationOptions) {
    return ValidateBy({
        name: IS_CURRENCY,
        constraints: [options],
        validator: {
            validate: function (value, args) { return isCurrency(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a currency'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsCurrency.js.map