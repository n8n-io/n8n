"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsPostalCode = exports.isPostalCode = exports.IS_POSTAL_CODE = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isPostalCode_1 = __importDefault(require("validator/lib/isPostalCode"));
exports.IS_POSTAL_CODE = 'isPostalCode';
/**
 * Check if the string is a postal code, in the specified locale.
 * If given value is not a string, then it returns false.
 */
function isPostalCode(value, locale) {
    return typeof value === 'string' && (0, isPostalCode_1.default)(value, locale);
}
exports.isPostalCode = isPostalCode;
/**
 * Check if the string is a postal code, in the specified locale.
 * If given value is not a string, then it returns false.
 */
function IsPostalCode(locale, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_POSTAL_CODE,
        constraints: [locale],
        validator: {
            validate: (value, args) => isPostalCode(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a postal code', validationOptions),
        },
    }, validationOptions);
}
exports.IsPostalCode = IsPostalCode;
//# sourceMappingURL=IsPostalCode.js.map