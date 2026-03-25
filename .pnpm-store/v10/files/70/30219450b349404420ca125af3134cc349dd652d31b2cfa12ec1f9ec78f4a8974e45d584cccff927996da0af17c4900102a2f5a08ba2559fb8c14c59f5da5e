import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var IS_IN = 'isIn';
/**
 * Checks if given value is in a array of allowed values.
 */
export function isIn(value, possibleValues) {
    return !Array.isArray(possibleValues) || possibleValues.some(function (possibleValue) { return possibleValue === value; });
}
/**
 * Checks if given value is in a array of allowed values.
 */
export function IsIn(values, validationOptions) {
    return ValidateBy({
        name: IS_IN,
        constraints: [values],
        validator: {
            validate: function (value, args) { return isIn(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be one of the following values: $constraint1'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsIn.js.map