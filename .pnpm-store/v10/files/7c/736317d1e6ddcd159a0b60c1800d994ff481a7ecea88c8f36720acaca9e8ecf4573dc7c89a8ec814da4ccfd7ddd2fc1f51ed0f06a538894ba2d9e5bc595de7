import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var IS_POSITIVE = 'isPositive';
/**
 * Checks if the value is a positive number greater than zero.
 */
export function isPositive(value) {
    return typeof value === 'number' && value > 0;
}
/**
 * Checks if the value is a positive number greater than zero.
 */
export function IsPositive(validationOptions) {
    return ValidateBy({
        name: IS_POSITIVE,
        validator: {
            validate: function (value, args) { return isPositive(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a positive number'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsPositive.js.map