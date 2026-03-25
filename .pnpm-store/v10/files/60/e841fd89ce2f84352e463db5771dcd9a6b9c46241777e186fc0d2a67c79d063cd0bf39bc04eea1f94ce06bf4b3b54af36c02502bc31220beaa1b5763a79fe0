import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var IS_OBJECT = 'isObject';
/**
 * Checks if the value is valid Object.
 * Returns false if the value is not an object.
 */
export function isObject(value) {
    return value != null && (typeof value === 'object' || typeof value === 'function') && !Array.isArray(value);
}
/**
 * Checks if the value is valid Object.
 * Returns false if the value is not an object.
 */
export function IsObject(validationOptions) {
    return ValidateBy({
        name: IS_OBJECT,
        validator: {
            validate: function (value, args) { return isObject(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an object'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsObject.js.map