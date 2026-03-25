"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsStrongPassword = exports.isStrongPassword = exports.IS_STRONG_PASSWORD = void 0;
const validator_1 = __importDefault(require("validator"));
const ValidateBy_1 = require("../common/ValidateBy");
exports.IS_STRONG_PASSWORD = 'isStrongPassword';
/**
 * Checks if the string is a strong password.
 * If given value is not a string, then it returns false.
 */
function isStrongPassword(value, options) {
    return typeof value === 'string' && validator_1.default.isStrongPassword(value, options);
}
exports.isStrongPassword = isStrongPassword;
/**
 * Checks if the string is a strong password.
 * If given value is not a string, then it returns false.
 */
function IsStrongPassword(options, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_STRONG_PASSWORD,
        constraints: [options],
        validator: {
            validate: (value, args) => isStrongPassword(value, args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property is not strong enough', validationOptions),
        },
    }, validationOptions);
}
exports.IsStrongPassword = IsStrongPassword;
//# sourceMappingURL=IsStrongPassword.js.map