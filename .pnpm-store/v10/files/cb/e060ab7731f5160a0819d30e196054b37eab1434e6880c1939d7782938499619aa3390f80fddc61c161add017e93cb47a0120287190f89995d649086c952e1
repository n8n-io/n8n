"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Contains = exports.contains = exports.CONTAINS = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const contains_1 = __importDefault(require("validator/lib/contains"));
exports.CONTAINS = 'contains';
/**
 * Checks if the string contains the seed.
 * If given value is not a string, then it returns false.
 */
function contains(value, seed) {
    return typeof value === 'string' && (0, contains_1.default)(value, seed);
}
exports.contains = contains;
/**
 * Checks if the string contains the seed.
 * If given value is not a string, then it returns false.
 */
function Contains(seed, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.CONTAINS,
        constraints: [seed],
        validator: {
            validate: (value, args) => contains(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must contain a $constraint1 string', validationOptions),
        },
    }, validationOptions);
}
exports.Contains = Contains;
//# sourceMappingURL=Contains.js.map