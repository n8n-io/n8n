import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isJwtValidator from 'validator/lib/isJWT';
export var IS_JWT = 'isJwt';
/**
 * Checks if the string is valid JWT token.
 * If given value is not a string, then it returns false.
 */
export function isJWT(value) {
    return typeof value === 'string' && isJwtValidator(value);
}
/**
 * Checks if the string is valid JWT token.
 * If given value is not a string, then it returns false.
 */
export function IsJWT(validationOptions) {
    return ValidateBy({
        name: IS_JWT,
        validator: {
            validate: function (value, args) { return isJWT(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a jwt string'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsJWT.js.map