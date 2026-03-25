import { ConstraintMetadata } from './metadata/ConstraintMetadata';
import { ValidationMetadata } from './metadata/ValidationMetadata';
import { ValidationTypes } from './validation/ValidationTypes';
import { getFromContainer } from './container';
import { MetadataStorage, getMetadataStorage } from './metadata/MetadataStorage';
/**
 * Registers a custom validation decorator.
 */
export function registerDecorator(options) {
    let constraintCls;
    if (options.validator instanceof Function) {
        constraintCls = options.validator;
        const constraintClasses = getFromContainer(MetadataStorage).getTargetValidatorConstraints(options.validator);
        if (constraintClasses.length > 1) {
            throw `More than one implementation of ValidatorConstraintInterface found for validator on: ${options.target.name}:${options.propertyName}`;
        }
    }
    else {
        const validator = options.validator;
        constraintCls = class CustomConstraint {
            validate(value, validationArguments) {
                return validator.validate(value, validationArguments);
            }
            defaultMessage(validationArguments) {
                if (validator.defaultMessage) {
                    return validator.defaultMessage(validationArguments);
                }
                return '';
            }
        };
        getMetadataStorage().addConstraintMetadata(new ConstraintMetadata(constraintCls, options.name, options.async));
    }
    const validationMetadataArgs = {
        type: options.name && ValidationTypes.isValid(options.name) ? options.name : ValidationTypes.CUSTOM_VALIDATION,
        name: options.name,
        target: options.target,
        propertyName: options.propertyName,
        validationOptions: options.options,
        constraintCls: constraintCls,
        constraints: options.constraints,
    };
    getMetadataStorage().addValidationMetadata(new ValidationMetadata(validationMetadataArgs));
}
//# sourceMappingURL=register-decorator.js.map