import { registerDecorator } from '../../register-decorator';
export function buildMessage(impl, validationOptions) {
    return (validationArguments) => {
        const eachPrefix = validationOptions && validationOptions.each ? 'each value in ' : '';
        return impl(eachPrefix, validationArguments);
    };
}
export function ValidateBy(options, validationOptions) {
    return function (object, propertyName) {
        registerDecorator({
            name: options.name,
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            constraints: options.constraints,
            validator: options.validator,
        });
    };
}
//# sourceMappingURL=ValidateBy.js.map