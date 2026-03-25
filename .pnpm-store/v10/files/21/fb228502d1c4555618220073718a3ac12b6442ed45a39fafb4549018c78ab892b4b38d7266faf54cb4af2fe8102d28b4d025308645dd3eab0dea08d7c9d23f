"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsOctal = exports.isOctal = exports.IS_OCTAL = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isOctal_1 = __importDefault(require("validator/lib/isOctal"));
exports.IS_OCTAL = 'isOctal';
/**
 * Check if the string is a valid octal number.
 * If given value is not a string, then it returns false.
 */
function isOctal(value) {
    return typeof value === 'string' && (0, isOctal_1.default)(value);
}
exports.isOctal = isOctal;
/**
 * Check if the string is a valid octal number.
 * If given value is not a string, then it returns false.
 */
function IsOctal(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_OCTAL,
        validator: {
            validate: (value, args) => isOctal(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be valid octal number', validationOptions),
        },
    }, validationOptions);
}
exports.IsOctal = IsOctal;
//# sourceMappingURL=IsOctal.js.map