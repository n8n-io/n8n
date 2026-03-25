"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDecorator = void 0;
const ConstraintMetadata_1 = require("./metadata/ConstraintMetadata");
const ValidationMetadata_1 = require("./metadata/ValidationMetadata");
const ValidationTypes_1 = require("./validation/ValidationTypes");
const container_1 = require("./container");
const MetadataStorage_1 = require("./metadata/MetadataStorage");
/**
 * Registers a custom validation decorator.
 */
function registerDecorator(options) {
    let constraintCls;
    if (options.validator instanceof Function) {
        constraintCls = options.validator;
        const constraintClasses = (0, container_1.getFromContainer)(MetadataStorage_1.MetadataStorage).getTargetValidatorConstraints(options.validator);
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
        (0, MetadataStorage_1.getMetadataStorage)().addConstraintMetadata(new ConstraintMetadata_1.ConstraintMetadata(constraintCls, options.name, options.async));
    }
    const validationMetadataArgs = {
        type: options.name && ValidationTypes_1.ValidationTypes.isValid(options.name) ? options.name : ValidationTypes_1.ValidationTypes.CUSTOM_VALIDATION,
        name: options.name,
        target: options.target,
        propertyName: options.propertyName,
        validationOptions: options.options,
        constraintCls: constraintCls,
        constraints: options.constraints,
    };
    (0, MetadataStorage_1.getMetadataStorage)().addValidationMetadata(new ValidationMetadata_1.ValidationMetadata(validationMetadataArgs));
}
exports.registerDecorator = registerDecorator;
//# sourceMappingURL=register-decorator.js.map