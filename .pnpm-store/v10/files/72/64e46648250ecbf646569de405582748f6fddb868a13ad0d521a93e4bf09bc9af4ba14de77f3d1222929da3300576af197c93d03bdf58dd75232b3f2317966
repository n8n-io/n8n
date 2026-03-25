import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isSurrogatePairValidator from 'validator/lib/isSurrogatePair';
export const IS_SURROGATE_PAIR = 'isSurrogatePair';
/**
 * Checks if the string contains any surrogate pairs chars.
 * If given value is not a string, then it returns false.
 */
export function isSurrogatePair(value) {
    return typeof value === 'string' && isSurrogatePairValidator(value);
}
/**
 * Checks if the string contains any surrogate pairs chars.
 * If given value is not a string, then it returns false.
 */
export function IsSurrogatePair(validationOptions) {
    return ValidateBy({
        name: IS_SURROGATE_PAIR,
        validator: {
            validate: (value, args) => isSurrogatePair(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must contain any surrogate pairs chars', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsSurrogatePair.js.map