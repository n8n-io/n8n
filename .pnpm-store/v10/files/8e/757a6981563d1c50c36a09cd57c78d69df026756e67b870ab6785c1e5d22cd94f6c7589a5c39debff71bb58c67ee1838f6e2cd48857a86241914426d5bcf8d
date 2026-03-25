import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isJSONValidator from 'validator/lib/isJSON';
export const IS_JSON = 'isJson';
/**
 * Checks if the string is valid JSON (note: uses JSON.parse).
 * If given value is not a string, then it returns false.
 */
export function isJSON(value) {
    return typeof value === 'string' && isJSONValidator(value);
}
/**
 * Checks if the string is valid JSON (note: uses JSON.parse).
 * If given value is not a string, then it returns false.
 */
export function IsJSON(validationOptions) {
    return ValidateBy({
        name: IS_JSON,
        validator: {
            validate: (value, args) => isJSON(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be a json string', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsJSON.js.map