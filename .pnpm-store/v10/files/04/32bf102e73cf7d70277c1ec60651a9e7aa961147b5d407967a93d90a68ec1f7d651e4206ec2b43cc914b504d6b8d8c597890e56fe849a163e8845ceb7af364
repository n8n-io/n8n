"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsISIN = exports.isISIN = exports.IS_ISIN = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isISIN_1 = __importDefault(require("validator/lib/isISIN"));
exports.IS_ISIN = 'isIsin';
/**
 * Checks if the string is an ISIN (stock/security identifier).
 * If given value is not a string, then it returns false.
 */
function isISIN(value) {
    return typeof value === 'string' && (0, isISIN_1.default)(value);
}
exports.isISIN = isISIN;
/**
 * Checks if the string is an ISIN (stock/security identifier).
 * If given value is not a string, then it returns false.
 */
function IsISIN(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_ISIN,
        validator: {
            validate: (value, args) => isISIN(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be an ISIN (stock/security identifier)', validationOptions),
        },
    }, validationOptions);
}
exports.IsISIN = IsISIN;
//# sourceMappingURL=IsISIN.js.map