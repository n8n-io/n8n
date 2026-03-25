"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsAlpha = exports.isAlpha = exports.IS_ALPHA = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isAlpha_1 = __importDefault(require("validator/lib/isAlpha"));
exports.IS_ALPHA = 'isAlpha';
/**
 * Checks if the string contains only letters (a-zA-Z).
 * If given value is not a string, then it returns false.
 */
function isAlpha(value, locale) {
    return typeof value === 'string' && (0, isAlpha_1.default)(value, locale);
}
exports.isAlpha = isAlpha;
/**
 * Checks if the string contains only letters (a-zA-Z).
 * If given value is not a string, then it returns false.
 */
function IsAlpha(locale, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_ALPHA,
        constraints: [locale],
        validator: {
            validate: (value, args) => isAlpha(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must contain only letters (a-zA-Z)', validationOptions),
        },
    }, validationOptions);
}
exports.IsAlpha = IsAlpha;
//# sourceMappingURL=IsAlpha.js.map