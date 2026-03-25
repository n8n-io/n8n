import { buildMessage, ValidateBy } from './ValidateBy';
import isLatLongValidator from 'validator/lib/isLatLong';
export const IS_LATLONG = 'isLatLong';
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
            validate: (value, args) => isLatLong(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be a latitude,longitude string', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsLatLong.js.map