"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OneToOneInverseSideSubjectBuilder = void 0;
const Subject_1 = require("../Subject");
const OrmUtils_1 = require("../../util/OrmUtils");
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
class OneToOneInverseSideSubjectBuilder {
    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor(subjects) {
        this.subjects = subjects;
    }
    // ---------------------------------------------------------------------
    // Public Methods
    // ---------------------------------------------------------------------
    /**
     * Builds all required operations.
     */
    build() {
        this.subjects.forEach((subject) => {
            subject.metadata.oneToOneRelations.forEach((relation) => {
                // we don't need owning relations, this operation is only for inverse side of one-to-one relations
                // skip relations for which persistence is disabled
                if (relation.isOwning || relation.persistenceEnabled === false)
                    return;
                this.buildForSubjectRelation(subject, relation);
            });
        });
    }
    // ---------------------------------------------------------------------
    // Protected Methods
    // ---------------------------------------------------------------------
    /**
     * Builds operations for a given subject and relation.
     *
     * by example: subject is "post" entity we are saving here and relation is "category" inside it here.
     */
    buildForSubjectRelation(subject, relation) {
        // prepare objects (relation id map) for the database entity
        // note: subject.databaseEntity contains relation with loaded relation id only (id map)
        // by example: since subject is a post, we are expecting to get post's category saved in the database here,
        //             particularly its relation id, e.g. category id stored in the database
        let relatedEntityDatabaseRelationId = undefined;
        if (subject.databaseEntity)
            // related entity in the database can exist only if this entity (post) is saved
            relatedEntityDatabaseRelationId = relation.getEntityValue(subject.databaseEntity);
        // get related entities of persisted entity
        // by example: get category from the passed to persist post entity
        let relatedEntity = relation.getEntityValue(subject.entity); // by example: relatedEntity is a category here
        if (relatedEntity === undefined)
            // if relation is undefined then nothing to update
            return;
        // if related entity is null then we need to check if there a bind in the database and unset it
        // if there is no bind in the entity then we don't need to do anything
        // by example: if post.category = null and category has this post in the database then we unset it
        if (relatedEntity === null) {
            // it makes sense to update database only there is a previously set value in the database
            if (relatedEntityDatabaseRelationId) {
                // todo: probably we can improve this in the future by finding entity with column those values,
                // todo: maybe it was already in persistence process. This is possible due to unique requirements of join columns
                // we create a new subject which operations will be executed in subject operation executor
                const removedRelatedEntitySubject = new Subject_1.Subject({
                    metadata: relation.inverseEntityMetadata,
                    parentSubject: subject,
                    canBeUpdated: true,
                    identifier: relatedEntityDatabaseRelationId,
                    changeMaps: [
                        {
                            relation: relation.inverseRelation,
                            value: null,
                        },
                    ],
                });
                this.subjects.push(removedRelatedEntitySubject);
            }
            return;
        } // else means entity is bind in the database
        // extract only relation id from the related entities, since we only need it for comparison
        // by example: extract from category only relation id (category id, or let's say category title, depend on join column options)
        let relationIdMap = relation.inverseEntityMetadata.getEntityIdMap(relatedEntity); // by example: relationIdMap is category.id map here, e.g. { id: ... }
        // try to find a subject of this related entity, maybe it was loaded or was marked for persistence
        let relatedEntitySubject = this.subjects.find((operateSubject) => {
            return (!!operateSubject.entity &&
                operateSubject.entity === relatedEntity);
        });
        // if subject with entity was found take subject identifier as relation id map since it may contain extra properties resolved
        if (relatedEntitySubject)
            relationIdMap = relatedEntitySubject.identifier;
        // if relationIdMap is undefined then it means user binds object which is not saved in the database yet
        // by example: if post contains category which does not have id(s) yet (because its a new category)
        //             it means its always newly inserted and relation update operation always must be created for it
        //             it does not make sense to perform difference operation for it for both add and remove actions
        if (!relationIdMap) {
            // we decided to remove this error because it brings complications when saving object with non-saved entities
            // if related entity does not have a subject then it means user tries to bind entity which wasn't saved
            // in this persistence because he didn't pass this entity for save or he did not set cascades
            // but without entity being inserted we cannot bind it in the relation operation, so we throw an exception here
            // if (!relatedEntitySubject)
            //     throw new TypeORMError(`One-to-one inverse relation "${relation.entityMetadata.name}.${relation.propertyPath}" contains ` +
            //         `entity which does not exist in the database yet, thus cannot be bind in the database. ` +
            //         `Please setup cascade insertion or save entity before binding it.`);
            if (!relatedEntitySubject)
                return;
            // okay, so related subject exist and its marked for insertion, then add a new change map
            // by example: this will tell category to insert into its post relation our post we are working with
            //             relatedEntitySubject is newly inserted CategorySubject
            //             relation.inverseRelation is OneToOne owner relation inside Category
            //             subject is Post needs to be inserted into Category
            relatedEntitySubject.changeMaps.push({
                relation: relation.inverseRelation,
                value: subject,
            });
        }
        // check if this binding really exist in the database
        // by example: find our post if its already bind to category in the database and its not equal to what user tries to set
        const areRelatedIdEqualWithDatabase = relatedEntityDatabaseRelationId &&
            OrmUtils_1.OrmUtils.compareIds(relationIdMap, relatedEntityDatabaseRelationId);
        // if they aren't equal it means its a new relation and we need to "bind" them
        // by example: this will tell category to insert into its post relation our post we are working with
        //             relatedEntitySubject is newly inserted CategorySubject
        //             relation.inverseRelation is ManyToOne relation inside Category
        //             subject is Post needs to be inserted into Category
        if (!areRelatedIdEqualWithDatabase) {
            // if there is no relatedEntitySubject then it means "category" wasn't persisted,
            // but since we are going to update "category" table (since its an owning side of relation with join column)
            // we create a new subject here:
            if (!relatedEntitySubject) {
                relatedEntitySubject = new Subject_1.Subject({
                    metadata: relation.inverseEntityMetadata,
                    canBeUpdated: true,
                    identifier: relationIdMap,
                });
                this.subjects.push(relatedEntitySubject);
            }
            relatedEntitySubject.changeMaps.push({
                relation: relation.inverseRelation,
                value: subject,
            });
        }
    }
}
exports.OneToOneInverseSideSubjectBuilder = OneToOneInverseSideSubjectBuilder;

//# sourceMappingURL=OneToOneInverseSideSubjectBuilder.js.map
