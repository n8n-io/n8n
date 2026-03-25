import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var IS_BOOLEAN = 'isBoolean';
/**
 * Checks if a given value is a boolean.
 */
export function isBoolean(value) {
    return value instanceof Boolean || typeof value === 'boolean';
}
/**
 * Checks if a value is a boolean.
 */
export function IsBoolean(validationOptions) {
    return ValidateBy({
        name: IS_BOOLEAN,
        validator: {
            validate: function (value, args) { return isBoolean(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a boolean value'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsBoolean.js.map