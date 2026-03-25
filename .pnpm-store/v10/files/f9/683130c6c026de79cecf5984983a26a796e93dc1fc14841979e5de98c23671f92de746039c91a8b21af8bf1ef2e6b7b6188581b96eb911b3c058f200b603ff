"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsNotEmpty = exports.isNotEmpty = exports.IS_NOT_EMPTY = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.IS_NOT_EMPTY = 'isNotEmpty';
/**
 * Checks if given value is not empty (!== '', !== null, !== undefined).
 */
function isNotEmpty(value) {
    return value !== '' && value !== null && value !== undefined;
}
exports.isNotEmpty = isNotEmpty;
/**
 * Checks if given value is not empty (!== '', !== null, !== undefined).
 */
function IsNotEmpty(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_NOT_EMPTY,
        validator: {
            validate: (value, args) => isNotEmpty(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property should not be empty', validationOptions),
        },
    }, validationOptions);
}
exports.IsNotEmpty = IsNotEmpty;
//# sourceMappingURL=IsNotEmpty.js.map