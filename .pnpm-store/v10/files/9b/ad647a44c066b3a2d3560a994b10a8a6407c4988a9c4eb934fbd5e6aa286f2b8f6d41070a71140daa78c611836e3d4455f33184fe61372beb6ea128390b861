import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isDivisibleByValidator from 'validator/lib/isDivisibleBy';
export var IS_DIVISIBLE_BY = 'isDivisibleBy';
/**
 * Checks if value is a number that's divisible by another.
 */
export function isDivisibleBy(value, num) {
    return typeof value === 'number' && typeof num === 'number' && isDivisibleByValidator(String(value), num);
}
/**
 * Checks if value is a number that's divisible by another.
 */
export function IsDivisibleBy(num, validationOptions) {
    return ValidateBy({
        name: IS_DIVISIBLE_BY,
        constraints: [num],
        validator: {
            validate: function (value, args) { return isDivisibleBy(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be divisible by $constraint1'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsDivisibleBy.js.map