"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsArray = exports.isArray = exports.IS_ARRAY = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.IS_ARRAY = 'isArray';
/**
 * Checks if a given value is an array
 */
function isArray(value) {
    return Array.isArray(value);
}
exports.isArray = isArray;
/**
 * Checks if a given value is an array
 */
function IsArray(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_ARRAY,
        validator: {
            validate: (value, args) => isArray(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be an array', validationOptions),
        },
    }, validationOptions);
}
exports.IsArray = IsArray;
//# sourceMappingURL=IsArray.js.map