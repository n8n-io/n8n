import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isUrlValidator from 'validator/lib/isURL';
export const IS_URL = 'isUrl';
/**
 * Checks if the string is a url.
 * If given value is not a string, then it returns false.
 */
export function isURL(value, options) {
    return typeof value === 'string' && isUrlValidator(value, options);
}
/**
 * Checks if the string is a url.
 * If given value is not a string, then it returns false.
 */
export function IsUrl(options, validationOptions) {
    return ValidateBy({
        name: IS_URL,
        constraints: [options],
        validator: {
            validate: (value, args) => isURL(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be a URL address', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsUrl.js.map