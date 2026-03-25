import validator from 'validator';
import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var IS_STRONG_PASSWORD = 'isStrongPassword';
/**
 * Checks if the string is a strong password.
 * If given value is not a string, then it returns false.
 */
export function isStrongPassword(value, options) {
    return typeof value === 'string' && validator.isStrongPassword(value, options);
}
/**
 * Checks if the string is a strong password.
 * If given value is not a string, then it returns false.
 */
export function IsStrongPassword(options, validationOptions) {
    return ValidateBy({
        name: IS_STRONG_PASSWORD,
        constraints: [options],
        validator: {
            validate: function (value, args) { return isStrongPassword(value, args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property is not strong enough'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsStrongPassword.js.map