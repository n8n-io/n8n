"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsHash = exports.isHash = exports.IS_HASH = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isHash_1 = __importDefault(require("validator/lib/isHash"));
exports.IS_HASH = 'isHash';
/**
 * Check if the string is a hash of type algorithm.
 * Algorithm is one of ['md4', 'md5', 'sha1', 'sha256', 'sha384', 'sha512', 'ripemd128', 'ripemd160', 'tiger128',
 * 'tiger160', 'tiger192', 'crc32', 'crc32b']
 */
function isHash(value, algorithm) {
    return typeof value === 'string' && (0, isHash_1.default)(value, algorithm);
}
exports.isHash = isHash;
/**
 * Check if the string is a hash of type algorithm.
 * Algorithm is one of ['md4', 'md5', 'sha1', 'sha256', 'sha384', 'sha512', 'ripemd128', 'ripemd160', 'tiger128',
 * 'tiger160', 'tiger192', 'crc32', 'crc32b']
 */
function IsHash(algorithm, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_HASH,
        constraints: [algorithm],
        validator: {
            validate: (value, args) => isHash(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a hash of type $constraint1', validationOptions),
        },
    }, validationOptions);
}
exports.IsHash = IsHash;
//# sourceMappingURL=IsHash.js.map