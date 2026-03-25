"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsFirebasePushId = exports.isFirebasePushId = exports.IS_FIREBASE_PUSH_ID = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.IS_FIREBASE_PUSH_ID = 'IsFirebasePushId';
/**
 * Checks if the string is a Firebase Push Id
 * If given value is not a Firebase Push Id, it returns false
 */
function isFirebasePushId(value) {
    const webSafeRegex = /^[a-zA-Z0-9_-]*$/;
    return typeof value === 'string' && value.length === 20 && webSafeRegex.test(value);
}
exports.isFirebasePushId = isFirebasePushId;
/**
 * Checks if the string is a Firebase Push Id
 * If given value is not a Firebase Push Id, it returns false
 */
function IsFirebasePushId(validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_FIREBASE_PUSH_ID,
        validator: {
            validate: (value, args) => isFirebasePushId(value),
            defaultMessage: (0, ValidateBy_1.buildMessage)(eachPrefix => eachPrefix + '$property must be a Firebase Push Id', validationOptions),
        },
    }, validationOptions);
}
exports.IsFirebasePushId = IsFirebasePushId;
//# sourceMappingURL=IsFirebasePushId.js.map