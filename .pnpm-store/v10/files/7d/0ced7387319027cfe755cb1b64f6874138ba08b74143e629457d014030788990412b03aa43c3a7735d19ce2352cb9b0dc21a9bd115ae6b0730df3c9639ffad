import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var IS_EMPTY = 'isEmpty';
/**
 * Checks if given value is empty (=== '', === null, === undefined).
 */
export function isEmpty(value) {
    return value === '' || value === null || value === undefined;
}
/**
 * Checks if given value is empty (=== '', === null, === undefined).
 */
export function IsEmpty(validationOptions) {
    return ValidateBy({
        name: IS_EMPTY,
        validator: {
            validate: function (value, args) { return isEmpty(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be empty'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsEmpty.js.map