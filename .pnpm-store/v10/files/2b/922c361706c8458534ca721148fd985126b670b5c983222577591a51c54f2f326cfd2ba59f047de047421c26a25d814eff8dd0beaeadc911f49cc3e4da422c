import { ValidationTypes } from '../../validation/ValidationTypes';
import { ValidationMetadata } from '../../metadata/ValidationMetadata';
import { getMetadataStorage } from '../../metadata/MetadataStorage';
/**
 * Ignores the other validators on a property when the provided condition function returns false.
 */
export function ValidateIf(condition, validationOptions) {
    return function (object, propertyName) {
        const args = {
            type: ValidationTypes.CONDITIONAL_VALIDATION,
            target: object.constructor,
            propertyName: propertyName,
            constraints: [condition],
            validationOptions: validationOptions,
        };
        getMetadataStorage().addValidationMetadata(new ValidationMetadata(args));
    };
}
//# sourceMappingURL=ValidateIf.js.map