import { ConstraintMetadata } from './metadata/ConstraintMetadata';
import { ValidationMetadata } from './metadata/ValidationMetadata';
import { ValidationTypes } from './validation/ValidationTypes';
import { getFromContainer } from './container';
import { MetadataStorage, getMetadataStorage } from './metadata/MetadataStorage';
/**
 * Registers a custom validation decorator.
 */
export function registerDecorator(options) {
    var constraintCls;
    if (options.validator instanceof Function) {
        constraintCls = options.validator;
        var constraintClasses = getFromContainer(MetadataStorage).getTargetValidatorConstraints(options.validator);
        if (constraintClasses.length > 1) {
            throw "More than one implementation of ValidatorConstraintInterface found for validator on: ".concat(options.target.name, ":").concat(options.propertyName);
        }
    }
    else {
        var validator_1 = options.validator;
        constraintCls = /** @class */ (function () {
            function CustomConstraint() {
            }
            CustomConstraint.prototype.validate = function (value, validationArguments) {
                return validator_1.validate(value, validationArguments);
            };
            CustomConstraint.prototype.defaultMessage = function (validationArguments) {
                if (validator_1.defaultMessage) {
                    return validator_1.defaultMessage(validationArguments);
                }
                return '';
            };
            return CustomConstraint;
        }());
        getMetadataStorage().addConstraintMetadata(new ConstraintMetadata(constraintCls, options.name, options.async));
    }
    var validationMetadataArgs = {
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