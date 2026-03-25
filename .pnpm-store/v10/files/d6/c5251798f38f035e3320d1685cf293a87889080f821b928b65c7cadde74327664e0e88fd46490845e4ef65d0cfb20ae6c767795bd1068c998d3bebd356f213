import validator from 'validator';
import { buildMessage, ValidateBy } from '../common/ValidateBy';
export const IS_STRONG_PASSWORD = 'isStrongPassword';
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
            validate: (value, args) => isStrongPassword(value, args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property is not strong enough', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsStrongPassword.js.map