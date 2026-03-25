"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsTimeZone = exports.isTimeZone = exports.IS_TIMEZONE = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.IS_TIMEZONE = 'isTimeZone';
/**
 * Checks if the string represents a valid IANA timezone
 * If the given value is not a valid IANA timezone, then it returns false.
 */
function isTimeZone(value) {
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
exports.isTimeZone = isTimeZone;
/**
 * Checks if the string represents a valid IANA timezone
 * If the given value is not a valid IANA timezone, then it returns false.
 */
function IsTimeZone(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_TIMEZONE,
        validator: {
            validate: (value, args) => isTimeZone(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a valid IANA time-zone', validationOptions),
        },
    }, validationOptions);
}
exports.IsTimeZone = IsTimeZone;
//# sourceMappingURL=IsTimeZone.js.map