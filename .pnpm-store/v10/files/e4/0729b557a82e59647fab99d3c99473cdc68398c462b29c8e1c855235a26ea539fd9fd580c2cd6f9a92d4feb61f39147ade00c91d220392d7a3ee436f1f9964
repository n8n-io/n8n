"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsDataURI = exports.isDataURI = exports.IS_DATA_URI = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isDataURI_1 = __importDefault(require("validator/lib/isDataURI"));
exports.IS_DATA_URI = 'isDataURI';
/**
 * Check if the string is a data uri format.
 * If given value is not a string, then it returns false.
 */
function isDataURI(value) {
    return typeof value === 'string' && (0, isDataURI_1.default)(value);
}
exports.isDataURI = isDataURI;
/**
 * Check if the string is a data uri format.
 * If given value is not a string, then it returns false.
 */
function IsDataURI(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_DATA_URI,
        validator: {
            validate: (value, args) => isDataURI(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a data uri format', validationOptions),
        },
    }, validationOptions);
}
exports.IsDataURI = IsDataURI;
//# sourceMappingURL=IsDataURI.js.map