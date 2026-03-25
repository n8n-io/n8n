import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isBase32Validator from 'validator/lib/isBase32';
export const IS_BASE32 = 'isBase32';
/**
 * Checks if a string is base32 encoded.
 * If given value is not a string, then it returns false.
 */
export function isBase32(value) {
    return typeof value === 'string' && isBase32Validator(value);
}
/**
 * Check if a string is base32 encoded.
 * If given value is not a string, then it returns false.
 */
export function IsBase32(validationOptions) {
    return ValidateBy({
        name: IS_BASE32,
        validator: {
            validate: (value, args) => isBase32(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be base32 encoded', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsBase32.js.map