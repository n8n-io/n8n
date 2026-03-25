import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isMagnetURIValidator from 'validator/lib/isMagnetURI';
export var IS_MAGNET_URI = 'isMagnetURI';
/**
 * Check if the string is a magnet uri format.
 * If given value is not a string, then it returns false.
 */
export function isMagnetURI(value) {
    return typeof value === 'string' && isMagnetURIValidator(value);
}
/**
 * Check if the string is a magnet uri format.
 * If given value is not a string, then it returns false.
 */
export function IsMagnetURI(validationOptions) {
    return ValidateBy({
        name: IS_MAGNET_URI,
        validator: {
            validate: function (value, args) { return isMagnetURI(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be magnet uri format'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsMagnetURI.js.map