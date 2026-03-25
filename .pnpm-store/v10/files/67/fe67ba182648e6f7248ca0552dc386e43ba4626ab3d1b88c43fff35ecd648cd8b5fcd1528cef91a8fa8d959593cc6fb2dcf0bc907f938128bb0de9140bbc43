import { buildMessage, ValidateBy } from './ValidateBy';
import isLatLongValidator from 'validator/lib/isLatLong';
export var IS_LATLONG = 'isLatLong';
/**
 * Checks if a value is string in format a "latitude,longitude".
 */
export function isLatLong(value) {
    return typeof value === 'string' && isLatLongValidator(value);
}
/**
 * Checks if a value is string in format a "latitude,longitude".
 */
export function IsLatLong(validationOptions) {
    return ValidateBy({
        name: IS_LATLONG,
        validator: {
            validate: function (value, args) { return isLatLong(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a latitude,longitude string'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsLatLong.js.map