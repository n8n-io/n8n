"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsByteLength = exports.isByteLength = exports.IS_BYTE_LENGTH = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isByteLength_1 = __importDefault(require("validator/lib/isByteLength"));
exports.IS_BYTE_LENGTH = 'isByteLength';
/**
 * Checks if the string's length (in bytes) falls in a range.
 * If given value is not a string, then it returns false.
 */
function isByteLength(value, min, max) {
    return typeof value === 'string' && (0, isByteLength_1.default)(value, { min, max });
}
exports.isByteLength = isByteLength;
/**
 * Checks if the string's length (in bytes) falls in a range.
 * If given value is not a string, then it returns false.
 */
function IsByteLength(min, max, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_BYTE_LENGTH,
        constraints: [min, max],
        validator: {
            validate: (value, args) => isByteLength(value, args === null || args === void 0 ? void 0 : args.constraints[0], args === null || args === void 0 ? void 0 : args.constraints[1]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + "$property's byte length must fall into ($constraint1, $constraint2) range", validationOptions),
        },
    }, validationOptions);
}
exports.IsByteLength = IsByteLength;
//# sourceMappingURL=IsByteLength.js.map