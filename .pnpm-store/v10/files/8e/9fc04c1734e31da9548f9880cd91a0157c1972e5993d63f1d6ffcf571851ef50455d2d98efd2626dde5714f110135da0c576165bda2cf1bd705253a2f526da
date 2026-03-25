"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsDecimal = exports.isDecimal = exports.IS_DECIMAL = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isDecimal_1 = __importDefault(require("validator/lib/isDecimal"));
exports.IS_DECIMAL = 'isDecimal';
/**
 * Checks if the string is a valid decimal.
 * If given value is not a string, then it returns false.
 */
function isDecimal(value, options) {
    return typeof value === 'string' && (0, isDecimal_1.default)(value, options);
}
exports.isDecimal = isDecimal;
/**
 * Checks if the string is a valid decimal.
 * If given value is not a string, then it returns false.
 */
function IsDecimal(options, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_DECIMAL,
        constraints: [options],
        validator: {
            validate: (value, args) => isDecimal(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property is not a valid decimal number.', validationOptions),
        },
    }, validationOptions);
}
exports.IsDecimal = IsDecimal;
//# sourceMappingURL=IsDecimal.js.map