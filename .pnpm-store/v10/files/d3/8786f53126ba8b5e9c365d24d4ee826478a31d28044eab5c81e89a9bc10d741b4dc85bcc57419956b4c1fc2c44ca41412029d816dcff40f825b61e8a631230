import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isIBANValidator from 'validator/lib/isIBAN';
export const IS_IBAN = 'isIBAN';
/**
 * Check if a string is a IBAN (International Bank Account Number).
 * If given value is not a string, then it returns false.
 */
export function isIBAN(value) {
    return typeof value === 'string' && isIBANValidator(value);
}
/**
 * Check if a string is a IBAN (International Bank Account Number).
 * If given value is not a string, then it returns false.
 */
export function IsIBAN(validationOptions) {
    return ValidateBy({
        name: IS_IBAN,
        validator: {
            validate: (value, args) => isIBAN(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be an IBAN', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsIBAN.js.map