import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var IS_INT = 'isInt';
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
            validate: function (value, args) { return isInt(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be an integer number'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsInt.js.map