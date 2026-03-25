import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isIsbnValidator from 'validator/lib/isISBN';
export const IS_ISBN = 'isIsbn';
/**
 * Checks if the string is an ISBN (version 10 or 13).
 * If given value is not a string, then it returns false.
 */
export function isISBN(value, version) {
    /* eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion */
    const versionStr = version ? `${version}` : undefined;
    return typeof value === 'string' && isIsbnValidator(value, versionStr);
}
/**
 * Checks if the string is an ISBN (version 10 or 13).
 * If given value is not a string, then it returns false.
 */
export function IsISBN(version, validationOptions) {
    return ValidateBy({
        name: IS_ISBN,
        constraints: [version],
        validator: {
            validate: (value, args) => isISBN(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be an ISBN', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsISBN.js.map