import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isLengthValidator from 'validator/lib/isLength';
export var IS_LENGTH = 'isLength';
/**
 * Checks if the string's length falls in a range. Note: this function takes into account surrogate pairs.
 * If given value is not a string, then it returns false.
 */
export function length(value, min, max) {
    return typeof value === 'string' && isLengthValidator(value, { min: min, max: max });
}
/**
 * Checks if the string's length falls in a range. Note: this function takes into account surrogate pairs.
 * If given value is not a string, then it returns false.
 */
export function Length(min, max, validationOptions) {
    return ValidateBy({
        name: IS_LENGTH,
        constraints: [min, max],
        validator: {
            validate: function (value, args) { return length(value, args === null || args === void 0 ? void 0 : args.constraints[0], args === null || args === void 0 ? void 0 : args.constraints[1]); },
            defaultMessage: buildMessage(function (eachPrefix, args) {
                var isMinLength = (args === null || args === void 0 ? void 0 : args.constraints[0]) !== null && (args === null || args === void 0 ? void 0 : args.constraints[0]) !== undefined;
                var isMaxLength = (args === null || args === void 0 ? void 0 : args.constraints[1]) !== null && (args === null || args === void 0 ? void 0 : args.constraints[1]) !== undefined;
                if (isMinLength && (!args.value || args.value.length < (args === null || args === void 0 ? void 0 : args.constraints[0]))) {
                    return eachPrefix + '$property must be longer than or equal to $constraint1 characters';
                }
                else if (isMaxLength && args.value.length > (args === null || args === void 0 ? void 0 : args.constraints[1])) {
                    return eachPrefix + '$property must be shorter than or equal to $constraint2 characters';
                }
                return (eachPrefix +
                    '$property must be longer than or equal to $constraint1 and shorter than or equal to $constraint2 characters');
            }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=Length.js.map