import { ValidationTypes } from '../../validation/ValidationTypes';
import { ValidationMetadata } from '../../metadata/ValidationMetadata';
import { getMetadataStorage } from '../../metadata/MetadataStorage';
/**
 * Resolve promise before validation
 */
export function ValidatePromise(validationOptions) {
    return function (object, propertyName) {
        var args = {
            type: ValidationTypes.PROMISE_VALIDATION,
            target: object.constructor,
            propertyName: propertyName,
            validationOptions: validationOptions,
        };
        getMetadataStorage().addValidationMetadata(new ValidationMetadata(args));
    };
}
//# sourceMappingURL=ValidatePromise.js.map