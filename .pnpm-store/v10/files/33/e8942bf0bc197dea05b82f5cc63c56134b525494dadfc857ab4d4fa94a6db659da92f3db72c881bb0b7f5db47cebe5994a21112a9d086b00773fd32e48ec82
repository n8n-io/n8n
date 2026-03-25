import { buildMessage, ValidateBy } from '../common/ValidateBy';
import isUuidValidator from 'validator/lib/isUUID';
export var IS_UUID = 'isUuid';
/**
 * Checks if the string is a UUID (version 3, 4 or 5).
 * If given value is not a string, then it returns false.
 */
export function isUUID(value, version) {
    return typeof value === 'string' && isUuidValidator(value, version);
}
/**
 * Checks if the string is a UUID (version 3, 4 or 5).
 * If given value is not a string, then it returns false.
 */
export function IsUUID(version, validationOptions) {
    return ValidateBy({
        name: IS_UUID,
        constraints: [version],
        validator: {
            validate: function (value, args) { return isUUID(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix) { return eachPrefix + '$property must be a UUID'; }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsUUID.js.map