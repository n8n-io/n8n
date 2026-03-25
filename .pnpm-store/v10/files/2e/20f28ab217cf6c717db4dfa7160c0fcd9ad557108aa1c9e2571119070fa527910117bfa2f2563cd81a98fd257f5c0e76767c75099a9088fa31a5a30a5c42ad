"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsVariableWidth = exports.isVariableWidth = exports.IS_VARIABLE_WIDTH = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isVariableWidth_1 = __importDefault(require("validator/lib/isVariableWidth"));
exports.IS_VARIABLE_WIDTH = 'isVariableWidth';
/**
 * Checks if the string contains variable-width chars.
 * If given value is not a string, then it returns false.
 */
function isVariableWidth(value) {
    return typeof value === 'string' && (0, isVariableWidth_1.default)(value);
}
exports.isVariableWidth = isVariableWidth;
/**
 * Checks if the string contains variable-width chars.
 * If given value is not a string, then it returns false.
 */
function IsVariableWidth(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_VARIABLE_WIDTH,
        validator: {
            validate: (value, args) => isVariableWidth(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must contain a full-width and half-width characters', validationOptions),
        },
    }, validationOptions);
}
exports.IsVariableWidth = IsVariableWidth;
//# sourceMappingURL=IsVariableWidth.js.map