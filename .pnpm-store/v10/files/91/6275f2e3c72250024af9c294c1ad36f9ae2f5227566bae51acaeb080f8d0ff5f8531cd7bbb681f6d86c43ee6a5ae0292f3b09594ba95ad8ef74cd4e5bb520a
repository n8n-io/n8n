"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsEAN = exports.isEAN = exports.IS_EAN = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isEAN_1 = __importDefault(require("validator/lib/isEAN"));
exports.IS_EAN = 'isEAN';
/**
 * Check if the string is an EAN (European Article Number).
 * If given value is not a string, then it returns false.
 */
function isEAN(value) {
    return typeof value === 'string' && (0, isEAN_1.default)(value);
}
exports.isEAN = isEAN;
/**
 * Check if the string is an EAN (European Article Number).
 * If given value is not a string, then it returns false.
 */
function IsEAN(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_EAN,
        validator: {
            validate: (value, args) => isEAN(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be an EAN (European Article Number)', validationOptions),
        },
    }, validationOptions);
}
exports.IsEAN = IsEAN;
//# sourceMappingURL=IsEAN.js.map