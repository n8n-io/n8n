import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var IS_FIREBASE_PUSH_ID = 'IsFirebasePushId';
/**
 * Checks if the string is a Firebase Push Id
 * If given value is not a Firebase Push Id, it returns false
 */
export function isFirebasePushId(value) {
    var webSafeRegex = /^[a-zA-Z0-9_-]*$/;
    return typeof value === 'string' && value.length === 20 && webSafeRegex.test(value);
}
/**
 * Checks if the string is a Firebase Push Id
 * If given value is not a Firebase Push Id, it returns false
 */
export function IsFirebasePushId(validationOptions) {
    return ValidateBy({
        name: IS_FIREBASE_PUSH_ID,
        validator: {
            validate: function (value, args) { return isFirebasePushId(value); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a Firebase Push Id'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsFirebasePushId.js.map