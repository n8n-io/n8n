"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsAscii = exports.isAscii = exports.IS_ASCII = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isAscii_1 = __importDefault(require("validator/lib/isAscii"));
exports.IS_ASCII = 'isAscii';
/**
 * Checks if the string contains ASCII chars only.
 * If given value is not a string, then it returns false.
 */
function isAscii(value) {
    return typeof value === 'string' && (0, isAscii_1.default)(value);
}
exports.isAscii = isAscii;
/**
 * Checks if the string contains ASCII chars only.
 * If given value is not a string, then it returns false.
 */
function IsAscii(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_ASCII,
        validator: {
            validate: (value, args) => isAscii(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must contain only ASCII characters', validationOptions),
        },
    }, validationOptions);
}
exports.IsAscii = IsAscii;
//# sourceMappingURL=IsAscii.js.map