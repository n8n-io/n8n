"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsEmpty = exports.isEmpty = exports.IS_EMPTY = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.IS_EMPTY = 'isEmpty';
/**
 * Checks if given value is empty (=== '', === null, === undefined).
 */
function isEmpty(value) {
    return value === '' || value === null || value === undefined;
}
exports.isEmpty = isEmpty;
/**
 * Checks if given value is empty (=== '', === null, === undefined).
 */
function IsEmpty(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_EMPTY,
        validator: {
            validate: (value, args) => isEmpty(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be empty', validationOptions),
        },
    }, validationOptions);
}
exports.IsEmpty = IsEmpty;
//# sourceMappingURL=IsEmpty.js.map