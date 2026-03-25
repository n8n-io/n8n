import { Subject } from "../Subject";
import { ObjectLiteral } from "../../common/ObjectLiteral";
import { RelationMetadata } from "../../metadata/RelationMetadata";
/**
 * Builds operations needs to be executed for many-to-many relations of the given subjects.
 *
 * by example: post contains owner many-to-many relation with categories in the property called "categories", e.g.
 *             @ManyToMany(type => Category, category => category.posts) categories: Category[]
 *             If user adds categories into the post and saves post we need to bind them.
 *             This operation requires updation of junction table.
 */
export declare class ManyToManySubjectBuilder {
    protected subjects: Subject[];
    constructor(subjects: Subject[]);
    /**
     * Builds operations for any changes in the many-to-many relations of the subjects.
     */
    build(): void;
    /**
     * Builds operations for removal of all many-to-many records of all many-to-many relations of the given subject.
     */
    buildForAllRemoval(subject: Subject): void;
    /**
     * Builds operations for a given subject and relation.
     *
     * by example: subject is "post" entity we are saving here and relation is "categories" inside it here.
     */
    protected buildForSubjectRelation(subject: Subject, relation: RelationMetadata): void;
    /**
     * Creates identifiers for junction table.
     * Example: { postId: 1, categoryId: 2 }
     */
    protected buildJunctionIdentifier(subject: Subject, relation: RelationMetadata, relationId: ObjectLiteral): ObjectLiteral;
}
