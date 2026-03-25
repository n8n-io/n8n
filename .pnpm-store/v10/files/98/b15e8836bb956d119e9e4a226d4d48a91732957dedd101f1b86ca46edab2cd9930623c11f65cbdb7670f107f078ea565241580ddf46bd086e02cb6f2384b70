import { ValidationMetadata } from './ValidationMetadata';
import { ConstraintMetadata } from './ConstraintMetadata';
import { ValidationSchema } from '../validation-schema/ValidationSchema';
/**
 * Storage all metadatas.
 */
export declare class MetadataStorage {
    private validationMetadatas;
    private constraintMetadatas;
    get hasValidationMetaData(): boolean;
    /**
     * Adds a new validation metadata.
     */
    addValidationSchema(schema: ValidationSchema): void;
    /**
     * Adds a new validation metadata.
     */
    addValidationMetadata(metadata: ValidationMetadata): void;
    /**
     * Adds a new constraint metadata.
     */
    addConstraintMetadata(metadata: ConstraintMetadata): void;
    /**
     * Groups metadata by their property names.
     */
    groupByPropertyName(metadata: ValidationMetadata[]): {
        [propertyName: string]: ValidationMetadata[];
    };
    /**
     * Gets all validation metadatas for the given object with the given groups.
     */
    getTargetValidationMetadatas(targetConstructor: Function, targetSchema: string, always: boolean, strictGroups: boolean, groups?: string[]): ValidationMetadata[];
    /**
     * Gets all validator constraints for the given object.
     */
    getTargetValidatorConstraints(target: Function): ConstraintMetadata[];
}
/**
 * Gets metadata storage.
 * Metadata storage follows the best practices and stores metadata in a global variable.
 */
export declare function getMetadataStorage(): MetadataStorage;
