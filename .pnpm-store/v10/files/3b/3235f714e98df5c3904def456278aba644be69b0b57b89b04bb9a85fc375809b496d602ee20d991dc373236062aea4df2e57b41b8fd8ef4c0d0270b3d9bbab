import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isAlphanumericValidator from 'validator/lib/isAlphanumeric';
export const IS_ALPHANUMERIC = 'isAlphanumeric';
/**
 * Checks if the string contains only letters and numbers.
 * If given value is not a string, then it returns false.
 */
export function isAlphanumeric(value, locale) {
    return typeof value === 'string' && isAlphanumericValidator(value, locale);
}
/**
 * Checks if the string contains only letters and numbers.
 * If given value is not a string, then it returns false.
 */
export function IsAlphanumeric(locale, validationOptions) {
    return ValidateBy({
        name: IS_ALPHANUMERIC,
        constraints: [locale],
        validator: {
            validate: (value, args) => isAlphanumeric(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must contain only letters and numbers', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsAlphanumeric.js.map