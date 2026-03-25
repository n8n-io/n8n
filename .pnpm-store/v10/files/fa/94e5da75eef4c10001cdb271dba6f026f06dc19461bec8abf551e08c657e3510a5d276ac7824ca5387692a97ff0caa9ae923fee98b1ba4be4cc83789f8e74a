"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsMultibyte = exports.isMultibyte = exports.IS_MULTIBYTE = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isMultibyte_1 = __importDefault(require("validator/lib/isMultibyte"));
exports.IS_MULTIBYTE = 'isMultibyte';
/**
 * Checks if the string contains one or more multibyte chars.
 * If given value is not a string, then it returns false.
 */
function isMultibyte(value) {
    return typeof value === 'string' && (0, isMultibyte_1.default)(value);
}
exports.isMultibyte = isMultibyte;
/**
 * Checks if the string contains one or more multibyte chars.
 * If given value is not a string, then it returns false.
 */
function IsMultibyte(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_MULTIBYTE,
        validator: {
            validate: (value, args) => isMultibyte(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must contain one or more multibyte chars', validationOptions),
        },
    }, validationOptions);
}
exports.IsMultibyte = IsMultibyte;
//# sourceMappingURL=IsMultibyte.js.map