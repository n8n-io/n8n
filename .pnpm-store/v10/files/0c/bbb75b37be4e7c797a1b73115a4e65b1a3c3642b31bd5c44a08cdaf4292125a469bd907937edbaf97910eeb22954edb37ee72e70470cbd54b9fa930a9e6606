import { EntityMetadata } from "../metadata/EntityMetadata";
import { TypeORMError } from "./TypeORMError";
/**
 * Thrown when user tries to create entity id map from the mixed id value,
 * but id value is a single value when entity requires multiple values.
 */
export declare class CannotCreateEntityIdMapError extends TypeORMError {
    constructor(metadata: EntityMetadata, id: any);
}
