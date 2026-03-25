"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsHalfWidth = exports.isHalfWidth = exports.IS_HALF_WIDTH = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isHalfWidth_1 = __importDefault(require("validator/lib/isHalfWidth"));
exports.IS_HALF_WIDTH = 'isHalfWidth';
/**
 * Checks if the string contains any half-width chars.
 * If given value is not a string, then it returns false.
 */
function isHalfWidth(value) {
    return typeof value === 'string' && (0, isHalfWidth_1.default)(value);
}
exports.isHalfWidth = isHalfWidth;
/**
 * Checks if the string contains any half-width chars.
 * If given value is not a string, then it returns false.
 */
function IsHalfWidth(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_HALF_WIDTH,
        validator: {
            validate: (value, args) => isHalfWidth(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must contain a half-width characters', validationOptions),
        },
    }, validationOptions);
}
exports.IsHalfWidth = IsHalfWidth;
//# sourceMappingURL=IsHalfWidth.js.map