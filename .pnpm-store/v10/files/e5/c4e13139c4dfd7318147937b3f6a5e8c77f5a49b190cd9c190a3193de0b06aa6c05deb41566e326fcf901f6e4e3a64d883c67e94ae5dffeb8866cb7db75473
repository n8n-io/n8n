"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotContains = exports.notContains = exports.NOT_CONTAINS = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
const contains_1 = __importDefault(require("validator/lib/contains"));
exports.NOT_CONTAINS = 'notContains';
/**
 * Checks if the string does not contain the seed.
 * If given value is not a string, then it returns false.
 */
function notContains(value, seed) {
    return typeof value === 'string' && !(0, contains_1.default)(value, seed);
}
exports.notContains = notContains;
/**
 * Checks if the string does not contain the seed.
 * If given value is not a string, then it returns false.
 */
function NotContains(seed, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.NOT_CONTAINS,
        constraints: [seed],
        validator: {
            validate: (value, args) => notContains(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property should not contain a $constraint1 string', validationOptions),
        },
    }, validationOptions);
}
exports.NotContains = NotContains;
//# sourceMappingURL=NotContains.js.map