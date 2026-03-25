"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsBase32 = exports.isBase32 = exports.IS_BASE32 = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isBase32_1 = __importDefault(require("validator/lib/isBase32"));
exports.IS_BASE32 = 'isBase32';
/**
 * Checks if a string is base32 encoded.
 * If given value is not a string, then it returns false.
 */
function isBase32(value) {
    return typeof value === 'string' && (0, isBase32_1.default)(value);
}
exports.isBase32 = isBase32;
/**
 * Check if a string is base32 encoded.
 * If given value is not a string, then it returns false.
 */
function IsBase32(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_BASE32,
        validator: {
            validate: (value, args) => isBase32(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be base32 encoded', validationOptions),
        },
    }, validationOptions);
}
exports.IsBase32 = IsBase32;
//# sourceMappingURL=IsBase32.js.map