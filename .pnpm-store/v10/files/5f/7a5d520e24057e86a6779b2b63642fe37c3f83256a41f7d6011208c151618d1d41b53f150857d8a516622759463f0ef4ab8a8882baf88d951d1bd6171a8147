import { buildMessage, ValidateBy } from '../common/ValidateBy';
export const IS_NEGATIVE = 'isNegative';
/**
 * Checks if the value is a negative number smaller than zero.
 */
export function isNegative(value) {
    return typeof value === 'number' && value < 0;
}
/**
 * Checks if the value is a negative number smaller than zero.
 */
export function IsNegative(validationOptions) {
    return ValidateBy({
        name: IS_NEGATIVE,
        validator: {
            validate: (value, args) => isNegative(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be a negative number', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsNegative.js.map