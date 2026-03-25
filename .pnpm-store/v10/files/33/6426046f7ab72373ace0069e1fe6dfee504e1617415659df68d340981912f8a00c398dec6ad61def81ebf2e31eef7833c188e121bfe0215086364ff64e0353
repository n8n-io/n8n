import { ValidationMetadata } from '../../metadata/ValidationMetadata';
import { getMetadataStorage } from '../../metadata/MetadataStorage';
import { ValidationTypes } from '../../validation/ValidationTypes';
import { ConstraintMetadata } from '../../metadata/ConstraintMetadata';
/**
 * Registers custom validator class.
 */
export function ValidatorConstraint(options) {
    return function (target) {
        const isAsync = options && options.async;
        let name = options && options.name ? options.name : '';
        if (!name) {
            name = target.name;
            if (!name)
                // generate name if it was not given
                name = name.replace(/\.?([A-Z]+)/g, (x, y) => '_' + y.toLowerCase()).replace(/^_/, '');
        }
        const metadata = new ConstraintMetadata(target, name, isAsync);
        getMetadataStorage().addConstraintMetadata(metadata);
    };
}
export function Validate(constraintClass, constraintsOrValidationOptions, maybeValidationOptions) {
    return function (object, propertyName) {
        const args = {
            type: ValidationTypes.CUSTOM_VALIDATION,
            target: object.constructor,
            propertyName: propertyName,
            constraintCls: constraintClass,
            constraints: Array.isArray(constraintsOrValidationOptions) ? constraintsOrValidationOptions : undefined,
            validationOptions: !Array.isArray(constraintsOrValidationOptions)
                ? constraintsOrValidationOptions
                : maybeValidationOptions,
        };
        getMetadataStorage().addValidationMetadata(new ValidationMetadata(args));
    };
}
//# sourceMappingURL=Validate.js.map