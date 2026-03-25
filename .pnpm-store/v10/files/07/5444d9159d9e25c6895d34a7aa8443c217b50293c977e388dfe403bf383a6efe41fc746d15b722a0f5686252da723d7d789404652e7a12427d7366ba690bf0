import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isMultibyteValidator from 'validator/lib/isMultibyte';
export const IS_MULTIBYTE = 'isMultibyte';
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
            validate: (value, args) => isMultibyte(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must contain one or more multibyte chars', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsMultibyte.js.map