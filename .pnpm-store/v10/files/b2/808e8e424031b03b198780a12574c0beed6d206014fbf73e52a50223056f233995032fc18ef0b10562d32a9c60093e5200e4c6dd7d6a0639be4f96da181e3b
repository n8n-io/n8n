"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsHexColor = exports.isHexColor = exports.IS_HEX_COLOR = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isHexColor_1 = __importDefault(require("validator/lib/isHexColor"));
exports.IS_HEX_COLOR = 'isHexColor';
/**
 * Checks if the string is a hexadecimal color.
 * If given value is not a string, then it returns false.
 */
function isHexColor(value) {
    return typeof value === 'string' && (0, isHexColor_1.default)(value);
}
exports.isHexColor = isHexColor;
/**
 * Checks if the string is a hexadecimal color.
 * If given value is not a string, then it returns false.
 */
function IsHexColor(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_HEX_COLOR,
        validator: {
            validate: (value, args) => isHexColor(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a hexadecimal color', validationOptions),
        },
    }, validationOptions);
}
exports.IsHexColor = IsHexColor;
//# sourceMappingURL=IsHexColor.js.map