import { Subject } from "../Subject";
import { RelationMetadata } from "../../metadata/RelationMetadata";
/**
 * Builds operations needs to be executed for one-to-one non-owner relations of the given subjects.
 *
 * by example: post contains one-to-one non-owner relation with category in the property called "category", e.g.
 *             @OneToOne(type => Category, category => category.post) category: Category
 *             If user sets a category into the post and saves post we need to bind them.
 *             This operation requires updation of category table since its owner of the relation and contains a join column.
 *
 * note: this class shares lot of things with OneToManyUpdateBuilder, so when you change this class
 *       make sure to reflect changes there as well.
 */
export declare class OneToOneInverseSideSubjectBuilder {
    protected subjects: Subject[];
    constructor(subjects: Subject[]);
    /**
     * Builds all required operations.
     */
    build(): void;
    /**
     * Builds operations for a given subject and relation.
     *
     * by example: subject is "post" entity we are saving here and relation is "category" inside it here.
     */
    protected buildForSubjectRelation(subject: Subject, relation: RelationMetadata): void;
}
