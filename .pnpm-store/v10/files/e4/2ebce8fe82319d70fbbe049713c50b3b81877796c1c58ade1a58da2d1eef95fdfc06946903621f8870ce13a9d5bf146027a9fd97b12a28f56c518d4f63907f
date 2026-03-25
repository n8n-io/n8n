import { buildMessage, ValidateBy } from './ValidateBy';
import { ValidationTypes } from '../../validation/ValidationTypes';
// isDefined is (yet) a special case
export const IS_DEFINED = ValidationTypes.IS_DEFINED;
/**
 * Checks if value is defined (!== undefined, !== null).
 */
export function isDefined(value) {
    return value !== undefined && value !== null;
}
/**
 * Checks if value is defined (!== undefined, !== null).
 */
export function IsDefined(validationOptions) {
    return ValidateBy({
        name: IS_DEFINED,
        validator: {
            validate: (value) => isDefined(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property should not be null or undefined', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsDefined.js.map