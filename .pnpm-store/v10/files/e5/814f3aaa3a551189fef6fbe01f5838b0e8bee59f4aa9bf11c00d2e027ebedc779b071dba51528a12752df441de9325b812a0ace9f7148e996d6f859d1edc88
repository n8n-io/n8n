import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isBase58Validator from 'validator/lib/isBase58';
export var IS_BASE58 = 'isBase58';
/**
 * Checks if a string is base58 encoded.
 * If given value is not a string, then it returns false.
 */
export function isBase58(value) {
    return typeof value === 'string' && isBase58Validator(value);
}
/**
 * Checks if a string is base58 encoded.
 * If given value is not a string, then it returns false.
 */
export function IsBase58(validationOptions) {
    return ValidateBy({
        name: IS_BASE58,
        validator: {
            validate: function (value, args) { return isBase58(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be base58 encoded'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsBase58.js.map