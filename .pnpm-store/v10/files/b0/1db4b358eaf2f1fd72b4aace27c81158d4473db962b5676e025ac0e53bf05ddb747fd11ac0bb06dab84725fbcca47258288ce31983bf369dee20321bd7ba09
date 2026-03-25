"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsBooleanString = exports.isBooleanString = exports.IS_BOOLEAN_STRING = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isBoolean_1 = __importDefault(require("validator/lib/isBoolean"));
exports.IS_BOOLEAN_STRING = 'isBooleanString';
/**
 * Checks if a string is a boolean.
 * If given value is not a string, then it returns false.
 */
function isBooleanString(value) {
    return typeof value === 'string' && (0, isBoolean_1.default)(value);
}
exports.isBooleanString = isBooleanString;
/**
 * Checks if a string is a boolean.
 * If given value is not a string, then it returns false.
 */
function IsBooleanString(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_BOOLEAN_STRING,
        validator: {
            validate: (value, args) => isBooleanString(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a boolean string', validationOptions),
        },
    }, validationOptions);
}
exports.IsBooleanString = IsBooleanString;
//# sourceMappingURL=IsBooleanString.js.map