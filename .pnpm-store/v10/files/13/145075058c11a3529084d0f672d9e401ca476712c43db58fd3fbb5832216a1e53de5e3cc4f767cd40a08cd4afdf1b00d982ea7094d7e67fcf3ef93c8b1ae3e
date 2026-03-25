import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isOctalValidator from 'validator/lib/isOctal';
export const IS_OCTAL = 'isOctal';
/**
 * Check if the string is a valid octal number.
 * If given value is not a string, then it returns false.
 */
export function isOctal(value) {
    return typeof value === 'string' && isOctalValidator(value);
}
/**
 * Check if the string is a valid octal number.
 * If given value is not a string, then it returns false.
 */
export function IsOctal(validationOptions) {
    return ValidateBy({
        name: IS_OCTAL,
        validator: {
            validate: (value, args) => isOctal(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be valid octal number', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsOctal.js.map