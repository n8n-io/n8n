import { EntityMetadata } from "../metadata/EntityMetadata";
import { Driver } from "../driver/Driver";
/**
 * Validates built entity metadatas.
 */
export declare class EntityMetadataValidator {
    /**
     * Validates all given entity metadatas.
     */
    validateMany(entityMetadatas: EntityMetadata[], driver: Driver): void;
    /**
     * Validates given entity metadata.
     */
    validate(entityMetadata: EntityMetadata, allEntityMetadatas: EntityMetadata[], driver: Driver): void;
    /**
     * Validates dependencies of the entity metadatas.
     */
    protected validateDependencies(entityMetadatas: EntityMetadata[]): void;
    /**
     * Validates eager relations to prevent circular dependency in them.
     */
    protected validateEagerRelations(entityMetadatas: EntityMetadata[]): void;
}
