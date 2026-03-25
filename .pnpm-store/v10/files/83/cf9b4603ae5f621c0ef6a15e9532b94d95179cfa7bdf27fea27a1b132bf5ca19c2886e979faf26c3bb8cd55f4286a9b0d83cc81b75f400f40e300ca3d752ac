"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsLocale = exports.isLocale = exports.IS_LOCALE = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isLocale_1 = __importDefault(require("validator/lib/isLocale"));
exports.IS_LOCALE = 'isLocale';
/**
 * Check if the string is a locale.
 * If given value is not a string, then it returns false.
 */
function isLocale(value) {
    return typeof value === 'string' && (0, isLocale_1.default)(value);
}
exports.isLocale = isLocale;
/**
 * Check if the string is a locale.
 * If given value is not a string, then it returns false.
 */
function IsLocale(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_LOCALE,
        validator: {
            validate: (value, args) => isLocale(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be locale', validationOptions),
        },
    }, validationOptions);
}
exports.IsLocale = IsLocale;
//# sourceMappingURL=IsLocale.js.map