import { buildMessage, ValidateBy } from '../common/ValidateBy';
import containsValidator from 'validator/lib/contains';
export var NOT_CONTAINS = 'notContains';
/**
 * Checks if the string does not contain the seed.
 * If given value is not a string, then it returns false.
 */
export function notContains(value, seed) {
    return typeof value === 'string' && !containsValidator(value, seed);
}
/**
 * Checks if the string does not contain the seed.
 * If given value is not a string, then it returns false.
 */
export function NotContains(seed, validationOptions) {
    return ValidateBy({
        name: NOT_CONTAINS,
        constraints: [seed],
        validator: {
            validate: function (value, args) { return notContains(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property should not contain a $constraint1 string'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=NotContains.js.map