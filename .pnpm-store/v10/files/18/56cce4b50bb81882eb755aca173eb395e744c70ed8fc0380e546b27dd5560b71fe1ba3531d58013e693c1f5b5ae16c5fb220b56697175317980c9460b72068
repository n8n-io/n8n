import { buildMessage, ValidateBy } from '../common/ValidateBy';
export const IS_INT = 'isInt';
/**
 * Checks if value is an integer.
 */
export function isInt(val) {
    return typeof val === 'number' && Number.isInteger(val);
}
/**
 * Checks if value is an integer.
 */
export function IsInt(validationOptions) {
    return ValidateBy({
        name: IS_INT,
        validator: {
            validate: (value, args) => isInt(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be an integer number', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsInt.js.map