"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsMagnetURI = exports.isMagnetURI = exports.IS_MAGNET_URI = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isMagnetURI_1 = __importDefault(require("validator/lib/isMagnetURI"));
exports.IS_MAGNET_URI = 'isMagnetURI';
/**
 * Check if the string is a magnet uri format.
 * If given value is not a string, then it returns false.
 */
function isMagnetURI(value) {
    return typeof value === 'string' && (0, isMagnetURI_1.default)(value);
}
exports.isMagnetURI = isMagnetURI;
/**
 * Check if the string is a magnet uri format.
 * If given value is not a string, then it returns false.
 */
function IsMagnetURI(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_MAGNET_URI,
        validator: {
            validate: (value, args) => isMagnetURI(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be magnet uri format', validationOptions),
        },
    }, validationOptions);
}
exports.IsMagnetURI = IsMagnetURI;
//# sourceMappingURL=IsMagnetURI.js.map