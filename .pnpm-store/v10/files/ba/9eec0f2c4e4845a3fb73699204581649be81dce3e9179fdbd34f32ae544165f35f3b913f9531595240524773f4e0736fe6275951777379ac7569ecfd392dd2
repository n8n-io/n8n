"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsJWT = exports.isJWT = exports.IS_JWT = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isJWT_1 = __importDefault(require("validator/lib/isJWT"));
exports.IS_JWT = 'isJwt';
/**
 * Checks if the string is valid JWT token.
 * If given value is not a string, then it returns false.
 */
function isJWT(value) {
    return typeof value === 'string' && (0, isJWT_1.default)(value);
}
exports.isJWT = isJWT;
/**
 * Checks if the string is valid JWT token.
 * If given value is not a string, then it returns false.
 */
function IsJWT(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_JWT,
        validator: {
            validate: (value, args) => isJWT(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a jwt string', validationOptions),
        },
    }, validationOptions);
}
exports.IsJWT = IsJWT;
//# sourceMappingURL=IsJWT.js.map