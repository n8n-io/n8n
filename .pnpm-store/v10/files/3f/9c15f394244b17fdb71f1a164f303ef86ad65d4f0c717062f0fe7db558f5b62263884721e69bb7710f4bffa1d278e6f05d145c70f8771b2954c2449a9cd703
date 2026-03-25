import { buildMessage, ValidateBy } from './ValidateBy';
import { isLatLong } from './IsLatLong';
export var IS_LONGITUDE = 'isLongitude';
/**
 * Checks if a given value is a longitude.
 */
export function isLongitude(value) {
    return (typeof value === 'number' || typeof value === 'string') && isLatLong("0,".concat(value));
}
/**
 * Checks if a given value is a longitude.
 */
export function IsLongitude(validationOptions) {
    return ValidateBy({
        name: IS_LONGITUDE,
        validator: {
            validate: function (value, args) { return isLongitude(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a longitude string or number'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsLongitude.js.map