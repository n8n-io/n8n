import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isHashValidator from 'validator/lib/isHash';
export var IS_HASH = 'isHash';
/**
 * Check if the string is a hash of type algorithm.
 * Algorithm is one of ['md4', 'md5', 'sha1', 'sha256', 'sha384', 'sha512', 'ripemd128', 'ripemd160', 'tiger128',
 * 'tiger160', 'tiger192', 'crc32', 'crc32b']
 */
export function isHash(value, algorithm) {
    return typeof value === 'string' && isHashValidator(value, algorithm);
}
/**
 * Check if the string is a hash of type algorithm.
 * Algorithm is one of ['md4', 'md5', 'sha1', 'sha256', 'sha384', 'sha512', 'ripemd128', 'ripemd160', 'tiger128',
 * 'tiger160', 'tiger192', 'crc32', 'crc32b']
 */
export function IsHash(algorithm, validationOptions) {
    return ValidateBy({
        name: IS_HASH,
        constraints: [algorithm],
        validator: {
            validate: function (value, args) { return isHash(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a hash of type $constraint1'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsHash.js.map