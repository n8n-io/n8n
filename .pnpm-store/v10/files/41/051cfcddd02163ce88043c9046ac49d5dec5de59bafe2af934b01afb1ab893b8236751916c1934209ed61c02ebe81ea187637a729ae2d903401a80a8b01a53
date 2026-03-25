"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsHSL = exports.isHSL = exports.IS_HSL = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isHSL_1 = __importDefault(require("validator/lib/isHSL"));
exports.IS_HSL = 'isHSL';
/**
 * Check if the string is an HSL (hue, saturation, lightness, optional alpha) color based on CSS Colors Level 4 specification.
 * Comma-separated format supported. Space-separated format supported with the exception of a few edge cases (ex: hsl(200grad+.1%62%/1)).
 * If given value is not a string, then it returns false.
 */
function isHSL(value) {
    return typeof value === 'string' && (0, isHSL_1.default)(value);
}
exports.isHSL = isHSL;
/**
 * Check if the string is an HSL (hue, saturation, lightness, optional alpha) color based on CSS Colors Level 4 specification.
 * Comma-separated format supported. Space-separated format supported with the exception of a few edge cases (ex: hsl(200grad+.1%62%/1)).
 * If given value is not a string, then it returns false.
 */
function IsHSL(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_HSL,
        validator: {
            validate: (value, args) => isHSL(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a HSL color', validationOptions),
        },
    }, validationOptions);
}
exports.IsHSL = IsHSL;
//# sourceMappingURL=IsHSL.js.map