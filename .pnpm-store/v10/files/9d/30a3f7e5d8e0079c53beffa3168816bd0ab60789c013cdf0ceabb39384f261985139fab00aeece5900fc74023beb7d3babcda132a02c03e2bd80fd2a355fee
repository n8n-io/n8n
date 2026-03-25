import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isISSNValidator from 'validator/lib/isISSN';
export var IS_ISSN = 'isISSN';
/**
 * Checks if the string is a ISSN.
 * If given value is not a string, then it returns false.
 */
export function isISSN(value, options) {
    return typeof value === 'string' && isISSNValidator(value, options);
}
/**
 * Checks if the string is a ISSN.
 * If given value is not a string, then it returns false.
 */
export function IsISSN(options, validationOptions) {
    return ValidateBy({
        name: IS_ISSN,
        constraints: [options],
        validator: {
            validate: function (value, args) { return isISSN(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a ISSN'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsISSN.js.map