"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsBase58 = exports.isBase58 = exports.IS_BASE58 = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isBase58_1 = __importDefault(require("validator/lib/isBase58"));
exports.IS_BASE58 = 'isBase58';
/**
 * Checks if a string is base58 encoded.
 * If given value is not a string, then it returns false.
 */
function isBase58(value) {
    return typeof value === 'string' && (0, isBase58_1.default)(value);
}
exports.isBase58 = isBase58;
/**
 * Checks if a string is base58 encoded.
 * If given value is not a string, then it returns false.
 */
function IsBase58(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_BASE58,
        validator: {
            validate: (value, args) => isBase58(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be base58 encoded', validationOptions),
        },
    }, validationOptions);
}
exports.IsBase58 = IsBase58;
//# sourceMappingURL=IsBase58.js.map