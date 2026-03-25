"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MinDate = exports.minDate = exports.MIN_DATE = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.MIN_DATE = 'minDate';
/**
 * Checks if the value is a date that's after the specified date.
 */
function minDate(date, minDate) {
    return date instanceof Date && date.getTime() >= (minDate instanceof Date ? minDate : minDate()).getTime();
}
exports.minDate = minDate;
/**
 * Checks if the value is a date that's after the specified date.
 */
function MinDate(date, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.MIN_DATE,
        constraints: [date],
        validator: {
            validate: (value, args) => minDate(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => 'minimal allowed date for ' + eachPrefix + '$property is $constraint1', validationOptions),
        },
    }, validationOptions);
}
exports.MinDate = MinDate;
//# sourceMappingURL=MinDate.js.map