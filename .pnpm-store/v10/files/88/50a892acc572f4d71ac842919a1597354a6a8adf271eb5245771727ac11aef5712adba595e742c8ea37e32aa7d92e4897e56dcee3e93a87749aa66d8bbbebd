import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isBase64Validator from 'validator/lib/isBase64';
export const IS_BASE64 = 'isBase64';
/**
 * Checks if a string is base64 encoded.
 * If given value is not a string, then it returns false.
 */
export function isBase64(value) {
    return typeof value === 'string' && isBase64Validator(value);
}
/**
 * Checks if a string is base64 encoded.
 * If given value is not a string, then it returns false.
 */
export function IsBase64(validationOptions) {
    return ValidateBy({
        name: IS_BASE64,
        validator: {
            validate: (value, args) => isBase64(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be base64 encoded', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsBase64.js.map