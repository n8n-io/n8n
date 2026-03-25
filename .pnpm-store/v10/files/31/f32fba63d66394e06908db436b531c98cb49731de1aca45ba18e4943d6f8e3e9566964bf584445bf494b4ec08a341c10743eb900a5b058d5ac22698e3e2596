import { EntityMetadata } from "../../metadata/EntityMetadata";
import { ObjectLiteral } from "../../common/ObjectLiteral";
/**
 * Transforms plain old javascript object
 * Entity is constructed based on its entity metadata.
 */
export declare class PlainObjectToNewEntityTransformer {
    transform<T extends ObjectLiteral>(newEntity: T, object: ObjectLiteral, metadata: EntityMetadata, getLazyRelationsPromiseValue?: boolean): T;
    /**
     * Since db returns a duplicated rows of the data where accuracies of the same object can be duplicated
     * we need to group our result and we must have some unique id (primary key in our case)
     */
    private groupAndTransform;
}
