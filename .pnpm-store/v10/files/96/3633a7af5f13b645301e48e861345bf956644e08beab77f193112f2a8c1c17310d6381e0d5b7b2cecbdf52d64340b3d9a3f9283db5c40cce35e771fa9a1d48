"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsISO31661Alpha2 = exports.isISO31661Alpha2 = exports.IS_ISO31661_ALPHA_2 = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isISO31661Alpha2_1 = __importDefault(require("validator/lib/isISO31661Alpha2"));
exports.IS_ISO31661_ALPHA_2 = 'isISO31661Alpha2';
/**
 * Check if the string is a valid [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) officially assigned country code.
 */
function isISO31661Alpha2(value) {
    return typeof value === 'string' && (0, isISO31661Alpha2_1.default)(value);
}
exports.isISO31661Alpha2 = isISO31661Alpha2;
/**
 * Check if the string is a valid [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) officially assigned country code.
 */
function IsISO31661Alpha2(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_ISO31661_ALPHA_2,
        validator: {
            validate: (value, args) => isISO31661Alpha2(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a valid ISO31661 Alpha2 code', validationOptions),
        },
    }, validationOptions);
}
exports.IsISO31661Alpha2 = IsISO31661Alpha2;
//# sourceMappingURL=IsISO31661Alpha2.js.map