import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var MIN_DATE = 'minDate';
/**
 * Checks if the value is a date that's after the specified date.
 */
export function minDate(date, minDate) {
    return date instanceof Date && date.getTime() >= (minDate instanceof Date ? minDate : minDate()).getTime();
}
/**
 * Checks if the value is a date that's after the specified date.
 */
export function MinDate(date, validationOptions) {
    return ValidateBy({
        name: MIN_DATE,
        constraints: [date],
        validator: {
            validate: function (value, args) { return minDate(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return 'minimal allowed date for ' + eachPrefix + '$property is $constraint1'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=MinDate.js.map