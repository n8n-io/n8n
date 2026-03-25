"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsSemVer = exports.isSemVer = exports.IS_SEM_VER = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isSemVer_1 = __importDefault(require("validator/lib/isSemVer"));
exports.IS_SEM_VER = 'isSemVer';
/**
 * Check if the string is a Semantic Versioning Specification (SemVer).
 * If given value is not a string, then it returns false.
 */
function isSemVer(value) {
    return typeof value === 'string' && (0, isSemVer_1.default)(value);
}
exports.isSemVer = isSemVer;
/**
 * Check if the string is a Semantic Versioning Specification (SemVer).
 * If given value is not a string, then it returns false.
 */
function IsSemVer(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_SEM_VER,
        validator: {
            validate: (value, args) => isSemVer(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a Semantic Versioning Specification', validationOptions),
        },
    }, validationOptions);
}
exports.IsSemVer = IsSemVer;
//# sourceMappingURL=IsSemVer.js.map