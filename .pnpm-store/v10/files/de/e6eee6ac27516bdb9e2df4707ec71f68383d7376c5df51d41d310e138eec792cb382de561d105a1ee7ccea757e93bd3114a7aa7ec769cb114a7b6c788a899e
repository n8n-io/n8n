import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isVariableWidthValidator from 'validator/lib/isVariableWidth';
export const IS_VARIABLE_WIDTH = 'isVariableWidth';
/**
 * Checks if the string contains variable-width chars.
 * If given value is not a string, then it returns false.
 */
export function isVariableWidth(value) {
    return typeof value === 'string' && isVariableWidthValidator(value);
}
/**
 * Checks if the string contains variable-width chars.
 * If given value is not a string, then it returns false.
 */
export function IsVariableWidth(validationOptions) {
    return ValidateBy({
        name: IS_VARIABLE_WIDTH,
        validator: {
            validate: (value, args) => isVariableWidth(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must contain a full-width and half-width characters', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsVariableWidth.js.map