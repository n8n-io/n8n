import { EntityMetadata } from "../../metadata/EntityMetadata";
import { ObjectLiteral } from "../../common/ObjectLiteral";
/**
 * Transforms raw document into entity object.
 * Entity is constructed based on its entity metadata.
 */
export declare class DocumentToEntityTransformer {
    private enableRelationIdValues;
    constructor(enableRelationIdValues?: boolean);
    transformAll(documents: ObjectLiteral[], metadata: EntityMetadata): any[];
    transform(document: any, metadata: EntityMetadata): any;
}
