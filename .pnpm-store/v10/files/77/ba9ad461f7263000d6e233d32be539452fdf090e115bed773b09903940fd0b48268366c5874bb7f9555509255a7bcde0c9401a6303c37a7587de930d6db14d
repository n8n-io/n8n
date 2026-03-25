"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsIdentityCard = exports.isIdentityCard = exports.IS_IDENTITY_CARD = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isIdentityCard_1 = __importDefault(require("validator/lib/isIdentityCard"));
exports.IS_IDENTITY_CARD = 'isIdentityCard';
/**
 * Check if the string is a valid identity card code.
 * locale is one of ['ES', 'zh-TW', 'he-IL', 'ar-TN'] OR 'any'. If 'any' is used, function will check if any of the locals match.
 * Defaults to 'any'.
 * If given value is not a string, then it returns false.
 */
function isIdentityCard(value, locale) {
    return typeof value === 'string' && (0, isIdentityCard_1.default)(value, locale);
}
exports.isIdentityCard = isIdentityCard;
/**
 * Check if the string is a valid identity card code.
 * locale is one of ['ES', 'zh-TW', 'he-IL', 'ar-TN'] OR 'any'. If 'any' is used, function will check if any of the locals match.
 * Defaults to 'any'.
 * If given value is not a string, then it returns false.
 */
function IsIdentityCard(locale, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_IDENTITY_CARD,
        constraints: [locale],
        validator: {
            validate: (value, args) => isIdentityCard(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a identity card number', validationOptions),
        },
    }, validationOptions);
}
exports.IsIdentityCard = IsIdentityCard;
//# sourceMappingURL=IsIdentityCard.js.map