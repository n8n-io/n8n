import { Subject } from "../Subject";
import { RelationMetadata } from "../../metadata/RelationMetadata";
/**
 * Builds operations needs to be executed for one-to-many relations of the given subjects.
 *
 * by example: post contains one-to-many relation with category in the property called "categories", e.g.
 *             @OneToMany(type => Category, category => category.post) categories: Category[]
 *             If user adds categories into the post and saves post we need to bind them.
 *             This operation requires updation of category table since its owner of the relation and contains a join column.
 *
 * note: this class shares lot of things with OneToOneInverseSideOperationBuilder, so when you change this class
 *       make sure to reflect changes there as well.
 */
export declare class OneToManySubjectBuilder {
    protected subjects: Subject[];
    constructor(subjects: Subject[]);
    /**
     * Builds all required operations.
     */
    build(): void;
    /**
     * Builds operations for a given subject and relation.
     *
     * by example: subject is "post" entity we are saving here and relation is "categories" inside it here.
     */
    protected buildForSubjectRelation(subject: Subject, relation: RelationMetadata): void;
}
