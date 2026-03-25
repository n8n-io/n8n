"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsString = exports.isString = exports.IS_STRING = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.IS_STRING = 'isString';
/**
 * Checks if a given value is a real string.
 */
function isString(value) {
    return value instanceof String || typeof value === 'string';
}
exports.isString = isString;
/**
 * Checks if a given value is a real string.
 */
function IsString(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_STRING,
        validator: {
            validate: (value, args) => isString(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a string', validationOptions),
        },
    }, validationOptions);
}
exports.IsString = IsString;
//# sourceMappingURL=IsString.js.map