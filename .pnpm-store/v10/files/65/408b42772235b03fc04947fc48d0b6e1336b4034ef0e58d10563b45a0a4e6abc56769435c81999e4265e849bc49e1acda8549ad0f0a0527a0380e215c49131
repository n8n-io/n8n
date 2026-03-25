import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isNumericValidator from 'validator/lib/isNumeric';
export const IS_NUMBER_STRING = 'isNumberString';
/**
 * Checks if the string is numeric.
 * If given value is not a string, then it returns false.
 */
export function isNumberString(value, options) {
    return typeof value === 'string' && isNumericValidator(value, options);
}
/**
 * Checks if the string is numeric.
 * If given value is not a string, then it returns false.
 */
export function IsNumberString(options, validationOptions) {
    return ValidateBy({
        name: IS_NUMBER_STRING,
        constraints: [options],
        validator: {
            validate: (value, args) => isNumberString(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be a number string', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsNumberString.js.map