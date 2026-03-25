"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsBIC = exports.isBIC = exports.IS_BIC = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isBIC_1 = __importDefault(require("validator/lib/isBIC"));
exports.IS_BIC = 'isBIC';
/**
 * Check if a string is a BIC (Bank Identification Code) or SWIFT code.
 * If given value is not a string, then it returns false.
 */
function isBIC(value) {
    return typeof value === 'string' && (0, isBIC_1.default)(value);
}
exports.isBIC = isBIC;
/**
 * Check if a string is a BIC (Bank Identification Code) or SWIFT code.
 * If given value is not a string, then it returns false.
 */
function IsBIC(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_BIC,
        validator: {
            validate: (value, args) => isBIC(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a BIC or SWIFT code', validationOptions),
        },
    }, validationOptions);
}
exports.IsBIC = IsBIC;
//# sourceMappingURL=IsBIC.js.map