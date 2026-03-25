"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsAlphanumeric = exports.isAlphanumeric = exports.IS_ALPHANUMERIC = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isAlphanumeric_1 = __importDefault(require("validator/lib/isAlphanumeric"));
exports.IS_ALPHANUMERIC = 'isAlphanumeric';
/**
 * Checks if the string contains only letters and numbers.
 * If given value is not a string, then it returns false.
 */
function isAlphanumeric(value, locale) {
    return typeof value === 'string' && (0, isAlphanumeric_1.default)(value, locale);
}
exports.isAlphanumeric = isAlphanumeric;
/**
 * Checks if the string contains only letters and numbers.
 * If given value is not a string, then it returns false.
 */
function IsAlphanumeric(locale, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_ALPHANUMERIC,
        constraints: [locale],
        validator: {
            validate: (value, args) => isAlphanumeric(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must contain only letters and numbers', validationOptions),
        },
    }, validationOptions);
}
exports.IsAlphanumeric = IsAlphanumeric;
//# sourceMappingURL=IsAlphanumeric.js.map