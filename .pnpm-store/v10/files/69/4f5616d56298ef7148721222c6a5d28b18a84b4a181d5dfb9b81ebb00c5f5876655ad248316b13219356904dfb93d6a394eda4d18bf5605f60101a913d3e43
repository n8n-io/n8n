"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IsOptional = void 0;
const ValidationTypes_1 = require("../../validation/ValidationTypes");
const ValidationMetadata_1 = require("../../metadata/ValidationMetadata");
const MetadataStorage_1 = require("../../metadata/MetadataStorage");
/**
 * Checks if value is missing and if so, ignores all validators.
 */
function IsOptional(validationOptions) {
    return function (object, propertyName) {
        const args = {
            type: ValidationTypes_1.ValidationTypes.CONDITIONAL_VALIDATION,
            target: object.constructor,
            propertyName: propertyName,
            constraints: [
                (object, value) => {
                    return object[propertyName] !== null && object[propertyName] !== undefined;
                },
            ],
            validationOptions: validationOptions,
        };
        (0, MetadataStorage_1.getMetadataStorage)().addValidationMetadata(new ValidationMetadata_1.ValidationMetadata(args));
    };
}
exports.IsOptional = IsOptional;
//# sourceMappingURL=IsOptional.js.map