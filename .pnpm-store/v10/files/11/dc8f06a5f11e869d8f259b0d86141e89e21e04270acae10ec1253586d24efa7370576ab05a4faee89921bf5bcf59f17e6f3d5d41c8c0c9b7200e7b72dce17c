"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsInstance = exports.isInstance = exports.IS_INSTANCE = void 0;
const ValidateBy_1 = require("../common/ValidateBy");
exports.IS_INSTANCE = 'isInstance';
/**
 * Checks if the value is an instance of the specified object.
 */
function isInstance(object, targetTypeConstructor) {
    return (targetTypeConstructor && typeof targetTypeConstructor === 'function' && object instanceof targetTypeConstructor);
}
exports.isInstance = isInstance;
/**
 * Checks if the value is an instance of the specified object.
 */
function IsInstance(targetType, validationOptions) {
    return (0, ValidateBy_1.ValidateBy)({
        name: exports.IS_INSTANCE,
        constraints: [targetType],
        validator: {
            validate: (value, args) => isInstance(value, args === null || args === void 0 ? void 0 : args.constraints[0]),
            defaultMessage: (0, ValidateBy_1.buildMessage)((eachPrefix, args) => {
                if (args === null || args === void 0 ? void 0 : args.constraints[0]) {
                    return eachPrefix + `$property must be an instance of ${args === null || args === void 0 ? void 0 : args.constraints[0].name}`;
                }
                else {
                    return eachPrefix + `${exports.IS_INSTANCE} decorator expects and object as value, but got falsy value.`;
                }
            }, validationOptions),
        },
    }, validationOptions);
}
exports.IsInstance = IsInstance;
//# sourceMappingURL=IsInstance.js.map