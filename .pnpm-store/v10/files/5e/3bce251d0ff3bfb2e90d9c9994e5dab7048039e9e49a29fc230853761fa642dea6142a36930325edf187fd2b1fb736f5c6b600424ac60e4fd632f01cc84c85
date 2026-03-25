"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsISO8601 = exports.isISO8601 = exports.IS_ISO8601 = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isISO8601_1 = __importDefault(require("validator/lib/isISO8601"));
exports.IS_ISO8601 = 'isIso8601';
/**
 * Checks if the string is a valid ISO 8601 date.
 * If given value is not a string, then it returns false.
 * Use the option strict = true for additional checks for a valid date, e.g. invalidates dates like 2019-02-29.
 */
function isISO8601(value, options) {
    return typeof value === 'string' && (0, isISO8601_1.default)(value, options);
}
exports.isISO8601 = isISO8601;
/**
 * Checks if the string is a valid ISO 8601 date.
 * If given value is not a string, then it returns false.
 * Use the option strict = true for additional checks for a valid date, e.g. invalidates dates like 2019-02-29.
 */
function IsISO8601(options, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_ISO8601,
        constraints: [options],
        validator: {
            validate: (value, args) => isISO8601(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a valid ISO 8601 date string', validationOptions),
        },
    }, validationOptions);
}
exports.IsISO8601 = IsISO8601;
//# sourceMappingURL=IsISO8601.js.map