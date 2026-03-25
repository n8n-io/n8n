"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsHexadecimal = exports.isHexadecimal = exports.IS_HEXADECIMAL = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isHexadecimal_1 = __importDefault(require("validator/lib/isHexadecimal"));
exports.IS_HEXADECIMAL = 'isHexadecimal';
/**
 * Checks if the string is a hexadecimal number.
 * If given value is not a string, then it returns false.
 */
function isHexadecimal(value) {
    return typeof value === 'string' && (0, isHexadecimal_1.default)(value);
}
exports.isHexadecimal = isHexadecimal;
/**
 * Checks if the string is a hexadecimal number.
 * If given value is not a string, then it returns false.
 */
function IsHexadecimal(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_HEXADECIMAL,
        validator: {
            validate: (value, args) => isHexadecimal(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a hexadecimal number', validationOptions),
        },
    }, validationOptions);
}
exports.IsHexadecimal = IsHexadecimal;
//# sourceMappingURL=IsHexadecimal.js.map