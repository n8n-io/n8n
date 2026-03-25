import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isPassportNumberValidator from 'validator/lib/isPassportNumber';
export const IS_PASSPORT_NUMBER = 'isPassportNumber';
/**
 * Check if the string is a valid passport number relative to a specific country code.
 * If given value is not a string, then it returns false.
 */
export function isPassportNumber(value, countryCode) {
    return typeof value === 'string' && isPassportNumberValidator(value, countryCode);
}
/**
 * Check if the string is a valid passport number relative to a specific country code.
 * If given value is not a string, then it returns false.
 */
export function IsPassportNumber(countryCode, validationOptions) {
    return ValidateBy({
        name: IS_PASSPORT_NUMBER,
        constraints: [countryCode],
        validator: {
            validate: (value, args) => isPassportNumber(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be valid passport number', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsPassportNumber.js.map