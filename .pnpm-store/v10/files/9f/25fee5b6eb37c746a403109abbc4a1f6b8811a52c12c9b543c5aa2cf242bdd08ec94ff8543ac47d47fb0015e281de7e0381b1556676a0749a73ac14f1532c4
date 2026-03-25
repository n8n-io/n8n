import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isByteLengthValidator from 'validator/lib/isByteLength';
export const IS_BYTE_LENGTH = 'isByteLength';
/**
 * Checks if the string's length (in bytes) falls in a range.
 * If given value is not a string, then it returns false.
 */
export function isByteLength(value, min, max) {
    return typeof value === 'string' && isByteLengthValidator(value, { min, max });
}
/**
 * Checks if the string's length (in bytes) falls in a range.
 * If given value is not a string, then it returns false.
 */
export function IsByteLength(min, max, validationOptions) {
    return ValidateBy({
        name: IS_BYTE_LENGTH,
        constraints: [min, max],
        validator: {
            validate: (value, args) => isByteLength(value, args === null || args === void 0 ? void 0 : args.constraints[0], args === null || args === void 0 ? void 0 : args.constraints[1]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + "$property's byte length must fall into ($constraint1, $constraint2) range", validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsByteLength.js.map