import { ObjectLiteral } from "../../common/ObjectLiteral";
import { EntityMetadata } from "../../metadata/EntityMetadata";
import { EntityManager } from "../../entity-manager/EntityManager";
/**
 * Transforms plain old javascript object
 * Entity is constructed based on its entity metadata.
 */
export declare class PlainObjectToDatabaseEntityTransformer {
    private manager;
    constructor(manager: EntityManager);
    transform(plainObject: ObjectLiteral, metadata: EntityMetadata): Promise<ObjectLiteral | undefined>;
}
