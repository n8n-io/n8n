"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsISRC = exports.isISRC = exports.IS_ISRC = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isISRC_1 = __importDefault(require("validator/lib/isISRC"));
exports.IS_ISRC = 'isISRC';
/**
 * Check if the string is a ISRC.
 * If given value is not a string, then it returns false.
 */
function isISRC(value) {
    return typeof value === 'string' && (0, isISRC_1.default)(value);
}
exports.isISRC = isISRC;
/**
 * Check if the string is a ISRC.
 * If given value is not a string, then it returns false.
 */
function IsISRC(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_ISRC,
        validator: {
            validate: (value, args) => isISRC(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be an ISRC', validationOptions),
        },
    }, validationOptions);
}
exports.IsISRC = IsISRC;
//# sourceMappingURL=IsISRC.js.map