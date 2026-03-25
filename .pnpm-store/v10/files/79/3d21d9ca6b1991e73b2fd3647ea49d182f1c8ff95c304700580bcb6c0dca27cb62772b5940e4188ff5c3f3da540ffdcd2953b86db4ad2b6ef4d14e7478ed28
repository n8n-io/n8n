import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isIdentityCardValidator from 'validator/lib/isIdentityCard';
export const IS_IDENTITY_CARD = 'isIdentityCard';
/**
 * Check if the string is a valid identity card code.
 * locale is one of ['ES', 'zh-TW', 'he-IL', 'ar-TN'] OR 'any'. If 'any' is used, function will check if any of the locals match.
 * Defaults to 'any'.
 * If given value is not a string, then it returns false.
 */
export function isIdentityCard(value, locale) {
    return typeof value === 'string' && isIdentityCardValidator(value, locale);
}
/**
 * Check if the string is a valid identity card code.
 * locale is one of ['ES', 'zh-TW', 'he-IL', 'ar-TN'] OR 'any'. If 'any' is used, function will check if any of the locals match.
 * Defaults to 'any'.
 * If given value is not a string, then it returns false.
 */
export function IsIdentityCard(locale, validationOptions) {
    return ValidateBy({
        name: IS_IDENTITY_CARD,
        constraints: [locale],
        validator: {
            validate: (value, args) => isIdentityCard(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be a identity card number', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsIdentityCard.js.map