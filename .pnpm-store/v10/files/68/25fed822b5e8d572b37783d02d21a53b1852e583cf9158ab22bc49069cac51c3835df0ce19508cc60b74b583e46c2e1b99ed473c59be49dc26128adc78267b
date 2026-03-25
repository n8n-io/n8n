import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isBICValidator from 'validator/lib/isBIC';
export var IS_BIC = 'isBIC';
/**
 * Check if a string is a BIC (Bank Identification Code) or SWIFT code.
 * If given value is not a string, then it returns false.
 */
export function isBIC(value) {
    return typeof value === 'string' && isBICValidator(value);
}
/**
 * Check if a string is a BIC (Bank Identification Code) or SWIFT code.
 * If given value is not a string, then it returns false.
 */
export function IsBIC(validationOptions) {
    return ValidateBy({
        name: IS_BIC,
        validator: {
            validate: function (value, args) { return isBIC(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a BIC or SWIFT code'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsBIC.js.map