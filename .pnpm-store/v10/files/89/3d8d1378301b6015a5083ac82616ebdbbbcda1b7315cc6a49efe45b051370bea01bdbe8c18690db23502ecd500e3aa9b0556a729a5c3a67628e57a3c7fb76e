import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isRFC3339Validator from 'validator/lib/isRFC3339';
export const IS_RFC_3339 = 'isRFC3339';
/**
 * Check if the string is a valid RFC 3339 date.
 * If given value is not a string, then it returns false.
 */
export function isRFC3339(value) {
    return typeof value === 'string' && isRFC3339Validator(value);
}
/**
 * Check if the string is a valid RFC 3339 date.
 * If given value is not a string, then it returns false.
 */
export function IsRFC3339(validationOptions) {
    return ValidateBy({
        name: IS_RFC_3339,
        validator: {
            validate: (value, args) => isRFC3339(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be RFC 3339 date', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsRFC3339.js.map