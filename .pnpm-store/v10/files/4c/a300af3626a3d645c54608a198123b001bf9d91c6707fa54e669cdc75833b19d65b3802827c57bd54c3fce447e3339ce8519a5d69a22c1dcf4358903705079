"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsEmail = exports.isEmail = exports.IS_EMAIL = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isEmail_1 = __importDefault(require("validator/lib/isEmail"));
exports.IS_EMAIL = 'isEmail';
/**
 * Checks if the string is an email.
 * If given value is not a string, then it returns false.
 */
function isEmail(value, options) {
    return typeof value === 'string' && (0, isEmail_1.default)(value, options);
}
exports.isEmail = isEmail;
/**
 * Checks if the string is an email.
 * If given value is not a string, then it returns false.
 */
function IsEmail(options, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_EMAIL,
        constraints: [options],
        validator: {
            validate: (value, args) => isEmail(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be an email', validationOptions),
        },
    }, validationOptions);
}
exports.IsEmail = IsEmail;
//# sourceMappingURL=IsEmail.js.map