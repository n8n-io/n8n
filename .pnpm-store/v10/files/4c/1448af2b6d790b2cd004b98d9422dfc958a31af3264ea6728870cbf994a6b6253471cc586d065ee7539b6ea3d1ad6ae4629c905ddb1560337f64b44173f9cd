"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsBase64 = exports.isBase64 = exports.IS_BASE64 = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isBase64_1 = __importDefault(require("validator/lib/isBase64"));
exports.IS_BASE64 = 'isBase64';
/**
 * Checks if a string is base64 encoded.
 * If given value is not a string, then it returns false.
 */
function isBase64(value) {
    return typeof value === 'string' && (0, isBase64_1.default)(value);
}
exports.isBase64 = isBase64;
/**
 * Checks if a string is base64 encoded.
 * If given value is not a string, then it returns false.
 */
function IsBase64(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_BASE64,
        validator: {
            validate: (value, args) => isBase64(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be base64 encoded', validationOptions),
        },
    }, validationOptions);
}
exports.IsBase64 = IsBase64;
//# sourceMappingURL=IsBase64.js.map