"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidateBy = exports.buildMessage = void 0;
const register_decorator_1 = require("../../register-decorator");
function buildMessage(impl, validationOptions) {
    return (validationArguments) => {
        const eachPrefix = validationOptions && validationOptions.each ? 'each value in ' : '';
        return impl(eachPrefix, validationArguments);
    };
}
exports.buildMessage = buildMessage;
function ValidateBy(options, validationOptions) {
    return function (object, propertyName) {
        (0, register_decorator_1.registerDecorator)({
            name: options.name,
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: options.constraints,
            validator: options.validator,
        });
    };
}
exports.ValidateBy = ValidateBy;
//# sourceMappingURL=ValidateBy.js.map