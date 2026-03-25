import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isISRCValidator from 'validator/lib/isISRC';
export const IS_ISRC = 'isISRC';
/**
 * Check if the string is a ISRC.
 * If given value is not a string, then it returns false.
 */
export function isISRC(value) {
    return typeof value === 'string' && isISRCValidator(value);
}
/**
 * Check if the string is a ISRC.
 * If given value is not a string, then it returns false.
 */
export function IsISRC(validationOptions) {
    return ValidateBy({
        name: IS_ISRC,
        validator: {
            validate: (value, args) => isISRC(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be an ISRC', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsISRC.js.map