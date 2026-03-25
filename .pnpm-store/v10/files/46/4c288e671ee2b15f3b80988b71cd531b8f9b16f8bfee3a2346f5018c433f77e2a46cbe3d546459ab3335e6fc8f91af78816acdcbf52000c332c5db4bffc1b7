"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsLowercase = exports.isLowercase = exports.IS_LOWERCASE = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isLowercase_1 = __importDefault(require("validator/lib/isLowercase"));
exports.IS_LOWERCASE = 'isLowercase';
/**
 * Checks if the string is lowercase.
 * If given value is not a string, then it returns false.
 */
function isLowercase(value) {
    return typeof value === 'string' && (0, isLowercase_1.default)(value);
}
exports.isLowercase = isLowercase;
/**
 * Checks if the string is lowercase.
 * If given value is not a string, then it returns false.
 */
function IsLowercase(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_LOWERCASE,
        validator: {
            validate: (value, args) => isLowercase(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a lowercase string', validationOptions),
        },
    }, validationOptions);
}
exports.IsLowercase = IsLowercase;
//# sourceMappingURL=IsLowercase.js.map