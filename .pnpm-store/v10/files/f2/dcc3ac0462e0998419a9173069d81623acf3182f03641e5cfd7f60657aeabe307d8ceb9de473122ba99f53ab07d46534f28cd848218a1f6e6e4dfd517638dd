import { buildMessage, ValidateBy } from '../common/ValidateBy';
export var IS_INSTANCE = 'isInstance';
/**
 * Checks if the value is an instance of the specified object.
 */
export function isInstance(object, targetTypeConstructor) {
    return (targetTypeConstructor && typeof targetTypeConstructor === 'function' && object instanceof targetTypeConstructor);
}
/**
 * Checks if the value is an instance of the specified object.
 */
export function IsInstance(targetType, validationOptions) {
    return ValidateBy({
        name: IS_INSTANCE,
        constraints: [targetType],
        validator: {
            validate: function (value, args) { return isInstance(value, args === null || args === void 0 ? void 0 : args.constraints[0]); },
            defaultMessage: buildMessage(function (eachPrefix, args) {
                if (args === null || args === void 0 ? void 0 : args.constraints[0]) {
                    return eachPrefix + "$property must be an instance of ".concat(args === null || args === void 0 ? void 0 : args.constraints[0].name);
                }
                else {
                    return eachPrefix + "".concat(IS_INSTANCE, " decorator expects and object as value, but got falsy value.");
                }
            }, validationOptions),
        },
    }, validationOptions);
}
//# sourceMappingURL=IsInstance.js.map