import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isLengthValidator from 'validator/lib/isLength';
export const MIN_LENGTH = 'minLength';
/**
 * Checks if the string's length is not less than given number. Note: this function takes into account surrogate pairs.
 * If given value is not a string, then it returns false.
 */
export function minLength(value, min) {
    return typeof value === 'string' && isLengthValidator(value, { min });
}
/**
 * Checks if the string's length is not less than given number. Note: this function takes into account surrogate pairs.
 * If given value is not a string, then it returns false.
 */
export function MinLength(min, validationOptions) {
    return ValidateBy({
        name: MIN_LENGTH,
        constraints: [min],
        validator: {
            validate: (value, args) => minLength(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be longer than or equal to $constraint1 characters', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=MinLength.js.map