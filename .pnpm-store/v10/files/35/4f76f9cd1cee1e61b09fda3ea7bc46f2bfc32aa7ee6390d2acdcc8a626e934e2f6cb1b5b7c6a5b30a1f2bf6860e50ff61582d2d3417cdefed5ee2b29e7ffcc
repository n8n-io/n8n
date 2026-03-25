"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsMimeType = exports.isMimeType = exports.IS_MIME_TYPE = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isMimeType_1 = __importDefault(require("validator/lib/isMimeType"));
exports.IS_MIME_TYPE = 'isMimeType';
/**
 * Check if the string matches to a valid MIME type format
 * If given value is not a string, then it returns false.
 */
function isMimeType(value) {
    return typeof value === 'string' && (0, isMimeType_1.default)(value);
}
exports.isMimeType = isMimeType;
/**
 * Check if the string matches to a valid MIME type format
 * If given value is not a string, then it returns false.
 */
function IsMimeType(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_MIME_TYPE,
        validator: {
            validate: (value, args) => isMimeType(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be MIME type format', validationOptions),
        },
    }, validationOptions);
}
exports.IsMimeType = IsMimeType;
//# sourceMappingURL=IsMimeType.js.map