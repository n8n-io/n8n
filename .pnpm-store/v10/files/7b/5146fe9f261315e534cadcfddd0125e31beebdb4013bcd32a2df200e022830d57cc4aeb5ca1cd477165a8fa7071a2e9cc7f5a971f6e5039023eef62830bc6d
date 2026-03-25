import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isFqdnValidator from 'validator/lib/isFQDN';
export var IS_FQDN = 'isFqdn';
/**
 * Checks if the string is a fully qualified domain name (e.g. domain.com).
 * If given value is not a string, then it returns false.
 */
export function isFQDN(value, options) {
    return typeof value === 'string' && isFqdnValidator(value, options);
}
/**
 * Checks if the string is a fully qualified domain name (e.g. domain.com).
 * If given value is not a string, then it returns false.
 */
export function IsFQDN(options, validationOptions) {
    return ValidateBy({
        name: IS_FQDN,
        constraints: [options],
        validator: {
            validate: function (value, args) { return isFQDN(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a valid domain name'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsFQDN.js.map