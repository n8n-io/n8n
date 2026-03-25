import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var MAX = 'max';
/**
 * Checks if the first number is less than or equal to the second.
 */
export function max(num, max) {
    return typeof num === 'number' && typeof max === 'number' && num <= max;
}
/**
 * Checks if the value is less than or equal to the allowed maximum value.
 */
export function Max(maxValue, validationOptions) {
    return ValidateBy({
        name: MAX,
        constraints: [maxValue],
        validator: {
            validate: function (value, args) { return max(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must not be greater than $constraint1'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=Max.js.map