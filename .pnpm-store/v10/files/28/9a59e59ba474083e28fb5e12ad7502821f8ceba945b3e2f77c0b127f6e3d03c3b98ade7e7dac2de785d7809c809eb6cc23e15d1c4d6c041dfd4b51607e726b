import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var MIN = 'min';
/**
 * Checks if the first number is greater than or equal to the second.
 */
export function min(num, min) {
    return typeof num === 'number' && typeof min === 'number' && num >= min;
}
/**
 * Checks if the value is greater than or equal to the allowed minimum value.
 */
export function Min(minValue, validationOptions) {
    return ValidateBy({
        name: MIN,
        constraints: [minValue],
        validator: {
            validate: function (value, args) { return min(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must not be less than $constraint1'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=Min.js.map