"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationSchemaToMetadataTransformer = void 0;
const ValidationMetadata_1 = require("../metadata/ValidationMetadata");
/**
 * Used to transform validation schemas to validation metadatas.
 */
class ValidationSchemaToMetadataTransformer {
    transform(schema) {
        const metadatas = [];
        Object.keys(schema.properties).forEach(property => {
            schema.properties[property].forEach(validation => {
                const validationOptions = {
                    message: validation.message,
                    groups: validation.groups,
                    always: validation.always,
                    each: validation.each,
                };
                const args = {
                    type: validation.type,
                    name: validation.name,
                    target: schema.name,
                    propertyName: property,
                    constraints: validation.constraints,
                    validationTypeOptions: validation.options,
                    validationOptions: validationOptions,
                };
                metadatas.push(new ValidationMetadata_1.ValidationMetadata(args));
            });
        });
        return metadatas;
    }
}
exports.ValidationSchemaToMetadataTransformer = ValidationSchemaToMetadataTransformer;
//# sourceMappingURL=ValidationSchemaToMetadataTransformer.js.map