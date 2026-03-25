import { buildMessage, ValidateBy } from '../common/ValidateBy';
import { isISO8601 } from './IsISO8601';
export var IS_DATE_STRING = 'isDateString';
/**
 * Alias for IsISO8601 validator
 */
export function isDateString(value, options) {
    return isISO8601(value, options);
}
/**
 * Alias for IsISO8601 validator
 */
export function IsDateString(options, validationOptions) {
    return ValidateBy({
        name: IS_DATE_STRING,
        constraints: [options],
        validator: {
            validate: function (value) { return isDateString(value, options); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a valid ISO 8601 date string'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsDateString.js.map