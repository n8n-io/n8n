import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isSemVerValidator from 'validator/lib/isSemVer';
export const IS_SEM_VER = 'isSemVer';
/**
 * Check if the string is a Semantic Versioning Specification (SemVer).
 * If given value is not a string, then it returns false.
 */
export function isSemVer(value) {
    return typeof value === 'string' && isSemVerValidator(value);
}
/**
 * Check if the string is a Semantic Versioning Specification (SemVer).
 * If given value is not a string, then it returns false.
 */
export function IsSemVer(validationOptions) {
    return ValidateBy({
        name: IS_SEM_VER,
        validator: {
            validate: (value, args) => isSemVer(value),
            defaultMessage: buildMessage(eachPrefix => eachPrefix + '$property must be a Semantic Versioning Specification', validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsSemVer.js.map