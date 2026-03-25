"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsISO31661Alpha3 = exports.isISO31661Alpha3 = exports.IS_ISO31661_ALPHA_3 = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isISO31661Alpha3_1 = __importDefault(require("validator/lib/isISO31661Alpha3"));
exports.IS_ISO31661_ALPHA_3 = 'isISO31661Alpha3';
/**
 * Check if the string is a valid [ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3) officially assigned country code.
 */
function isISO31661Alpha3(value) {
    return typeof value === 'string' && (0, isISO31661Alpha3_1.default)(value);
}
exports.isISO31661Alpha3 = isISO31661Alpha3;
/**
 * Check if the string is a valid [ISO 3166-1 alpha-3](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-3) officially assigned country code.
 */
function IsISO31661Alpha3(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_ISO31661_ALPHA_3,
        validator: {
            validate: (value, args) => isISO31661Alpha3(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a valid ISO31661 Alpha3 code', validationOptions),
        },
    }, validationOptions);
}
exports.IsISO31661Alpha3 = IsISO31661Alpha3;
//# sourceMappingURL=IsISO31661Alpha3.js.map