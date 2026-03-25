"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Length = exports.length = exports.IS_LENGTH = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const isLength_1 = __importDefault(require("validator/lib/isLength"));
exports.IS_LENGTH = 'isLength';
/**
 * Checks if the string's length falls in a range. Note: this function takes into account surrogate pairs.
 * If given value is not a string, then it returns false.
 */
function length(value, min, max) {
    return typeof value === 'string' && (0, isLength_1.default)(value, { min, max });
}
exports.length = length;
/**
 * Checks if the string's length falls in a range. Note: this function takes into account surrogate pairs.
 * If given value is not a string, then it returns false.
 */
function Length(min, max, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_LENGTH,
        constraints: [min, max],
        validator: {
            validate: (value, args) => length(value, args === null || args === void 0 ? void 0 : args.constraints[0], args === null || args === void 0 ? void 0 : args.constraints[1]),
            defaultMessage: (0, ValidateBy_1.buildMessage)((eachPrefix, args) => {
                const isMinLength = (args === null || args === void 0 ? void 0 : args.constraints[0]) !== null && (args === null || args === void 0 ? void 0 : args.constraints[0]) !== undefined;
                const isMaxLength = (args === null || args === void 0 ? void 0 : args.constraints[1]) !== null && (args === null || args === void 0 ? void 0 : args.constraints[1]) !== undefined;
                if (isMinLength && (!args.value || args.value.length < (args === null || args === void 0 ? void 0 : args.constraints[0]))) {
                    return eachPrefix + '$property must be longer than or equal to $constraint1 characters';
                }
                else if (isMaxLength && args.value.length > (args === null || args === void 0 ? void 0 : args.constraints[1])) {
                    return eachPrefix + '$property must be shorter than or equal to $constraint2 characters';
                }
                return (eachPrefix +
                    '$property must be longer than or equal to $constraint1 and shorter than or equal to $constraint2 characters');
            }, validationOptions),
        },
    }, validationOptions);
}
exports.Length = Length;
//# sourceMappingURL=Length.js.map