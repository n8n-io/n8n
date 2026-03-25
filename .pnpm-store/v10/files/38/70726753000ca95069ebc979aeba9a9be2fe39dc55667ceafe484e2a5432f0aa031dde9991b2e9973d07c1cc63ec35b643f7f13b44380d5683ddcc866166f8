import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isEmailValidator from 'validator/lib/isEmail';
export const IS_EMAIL = 'isEmail';
/**
 * Checks if the string is an email.
 * If given value is not a string, then it returns false.
 */
export function isEmail(value, options) {
    return typeof value === 'string' && isEmailValidator(value, options);
}
/**
 * Checks if the string is an email.
 * If given value is not a string, then it returns false.
 */
export function IsEmail(options, validationOptions) {
    return ValidateBy({
        name: IS_EMAIL,
        constraints: [options],
        validator: {
            validate: (value, args) => isEmail(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be an email', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsEmail.js.map