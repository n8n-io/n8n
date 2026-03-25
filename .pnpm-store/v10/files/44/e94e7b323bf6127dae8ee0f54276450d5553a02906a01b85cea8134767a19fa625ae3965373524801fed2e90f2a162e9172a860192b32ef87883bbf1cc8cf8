"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsRFC3339 = exports.isRFC3339 = exports.IS_RFC_3339 = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isRFC3339_1 = __importDefault(require("validator/lib/isRFC3339"));
exports.IS_RFC_3339 = 'isRFC3339';
/**
 * Check if the string is a valid RFC 3339 date.
 * If given value is not a string, then it returns false.
 */
function isRFC3339(value) {
    return typeof value === 'string' && (0, isRFC3339_1.default)(value);
}
exports.isRFC3339 = isRFC3339;
/**
 * Check if the string is a valid RFC 3339 date.
 * If given value is not a string, then it returns false.
 */
function IsRFC3339(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_RFC_3339,
        validator: {
            validate: (value, args) => isRFC3339(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be RFC 3339 date', validationOptions),
        },
    }, validationOptions);
}
exports.IsRFC3339 = IsRFC3339;
//# sourceMappingURL=IsRFC3339.js.map