"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsDateString = exports.isDateString = exports.IS_DATE_STRING = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const IsISO8601_1 = require("./IsISO8601");
exports.IS_DATE_STRING = 'isDateString';
/**
 * Alias for IsISO8601 validator
 */
function isDateString(value, options) {
    return (0, IsISO8601_1.isISO8601)(value, options);
}
exports.isDateString = isDateString;
/**
 * Alias for IsISO8601 validator
 */
function IsDateString(options, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_DATE_STRING,
        constraints: [options],
        validator: {
            validate: (value) => isDateString(value, options),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a valid ISO 8601 date string', validationOptions),
        },
    }, validationOptions);
}
exports.IsDateString = IsDateString;
//# sourceMappingURL=IsDateString.js.map