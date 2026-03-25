import { ValidationMetadata } from '../metadata/ValidationMetadata';
/**
 * Used to transform validation schemas to validation metadatas.
 */
export class ValidationSchemaToMetadataTransformer {
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
                metadatas.push(new ValidationMetadata(args));
            });
        });
        return metadatas;
    }
}
//# sourceMappingURL=ValidationSchemaToMetadataTransformer.js.map