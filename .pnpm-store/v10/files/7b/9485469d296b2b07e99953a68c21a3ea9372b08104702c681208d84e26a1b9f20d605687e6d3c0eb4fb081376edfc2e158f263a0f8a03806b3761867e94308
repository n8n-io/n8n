"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsISO4217CurrencyCode = exports.isISO4217CurrencyCode = exports.IS_ISO4217_CURRENCY_CODE = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isISO4217_1 = __importDefault(require("validator/lib/isISO4217"));
exports.IS_ISO4217_CURRENCY_CODE = 'isISO4217CurrencyCode';
/**
 * Check if the string is a valid [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) officially assigned currency code.
 */
function isISO4217CurrencyCode(value) {
    return typeof value === 'string' && (0, isISO4217_1.default)(value);
}
exports.isISO4217CurrencyCode = isISO4217CurrencyCode;
/**
 * Check if the string is a valid [ISO 4217](https://en.wikipedia.org/wiki/ISO_4217) officially assigned currency code.
 */
function IsISO4217CurrencyCode(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_ISO4217_CURRENCY_CODE,
        validator: {
            validate: (value, args) => isISO4217CurrencyCode(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a valid ISO4217 currency code', validationOptions),
        },
    }, validationOptions);
}
exports.IsISO4217CurrencyCode = IsISO4217CurrencyCode;
//# sourceMappingURL=is-iso4217-currency-code.js.map