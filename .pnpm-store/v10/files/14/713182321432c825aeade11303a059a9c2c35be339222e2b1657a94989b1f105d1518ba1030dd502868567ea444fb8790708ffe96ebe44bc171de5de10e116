"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsRgbColor = exports.isRgbColor = exports.IS_RGB_COLOR = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isRgbColor_1 = __importDefault(require("validator/lib/isRgbColor"));
exports.IS_RGB_COLOR = 'isRgbColor';
/**
 * Check if the string is a rgb or rgba color.
 * `includePercentValues` defaults to true. If you don't want to allow to set rgb or rgba values with percents, like rgb(5%,5%,5%), or rgba(90%,90%,90%,.3), then set it to false.
 * If given value is not a string, then it returns false.
 */
function isRgbColor(value, includePercentValues) {
    return typeof value === 'string' && (0, isRgbColor_1.default)(value, includePercentValues);
}
exports.isRgbColor = isRgbColor;
/**
 * Check if the string is a rgb or rgba color.
 * `includePercentValues` defaults to true. If you don't want to allow to set rgb or rgba values with percents, like rgb(5%,5%,5%), or rgba(90%,90%,90%,.3), then set it to false.
 * If given value is not a string, then it returns false.
 */
function IsRgbColor(includePercentValues, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_RGB_COLOR,
        constraints: [includePercentValues],
        validator: {
            validate: (value, args) => isRgbColor(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be RGB color', validationOptions),
        },
    }, validationOptions);
}
exports.IsRgbColor = IsRgbColor;
//# sourceMappingURL=IsRgbColor.js.map