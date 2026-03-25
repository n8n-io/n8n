import { buildMessage, ValidateBy } from '../common/ValidateBy';
export const IS_TIMEZONE = 'isTimeZone';
/**
 * Checks if the string represents a valid IANA timezone
 * If the given value is not a valid IANA timezone, then it returns false.
 */
export function isTimeZone(value) {
    try {
        if (typeof value !== 'string') {
            return false;
        }
        /** Specifying an invalid time-zone will raise a `RangeError: Invalid time zone specified` error. */
        Intl.DateTimeFormat(undefined, { timeZone: value });
        return true;
    }
    catch (exception) {
        return false;
    }
}
/**
 * Checks if the string represents a valid IANA timezone
 * If the given value is not a valid IANA timezone, then it returns false.
 */
export function IsTimeZone(validationOptions) {
    return ValidateBy({
        name: IS_TIMEZONE,
        validator: {
            validate: (value, args) => isTimeZone(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be a valid IANA time-zone', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsTimeZone.js.map