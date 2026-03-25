"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsFullWidth = exports.isFullWidth = exports.IS_FULL_WIDTH = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isFullWidth_1 = __importDefault(require("validator/lib/isFullWidth"));
exports.IS_FULL_WIDTH = 'isFullWidth';
/**
 * Checks if the string contains any full-width chars.
 * If given value is not a string, then it returns false.
 */
function isFullWidth(value) {
    return typeof value === 'string' && (0, isFullWidth_1.default)(value);
}
exports.isFullWidth = isFullWidth;
/**
 * Checks if the string contains any full-width chars.
 * If given value is not a string, then it returns false.
 */
function IsFullWidth(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_FULL_WIDTH,
        validator: {
            validate: (value, args) => isFullWidth(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must contain a full-width characters', validationOptions),
        },
    }, validationOptions);
}
exports.IsFullWidth = IsFullWidth;
//# sourceMappingURL=IsFullWidth.js.map