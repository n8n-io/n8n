"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsIBAN = exports.isIBAN = exports.IS_IBAN = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isIBAN_1 = __importDefault(require("validator/lib/isIBAN"));
exports.IS_IBAN = 'isIBAN';
/**
 * Check if a string is a IBAN (International Bank Account Number).
 * If given value is not a string, then it returns false.
 */
function isIBAN(value) {
    return typeof value === 'string' && (0, isIBAN_1.default)(value);
}
exports.isIBAN = isIBAN;
/**
 * Check if a string is a IBAN (International Bank Account Number).
 * If given value is not a string, then it returns false.
 */
function IsIBAN(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_IBAN,
        validator: {
            validate: (value, args) => isIBAN(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be an IBAN', validationOptions),
        },
    }, validationOptions);
}
exports.IsIBAN = IsIBAN;
//# sourceMappingURL=IsIBAN.js.map