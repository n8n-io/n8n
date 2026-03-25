"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectDatabaseEntityLoader = void 0;
/**
 * Loads database entities for all operate subjects which do not have database entity set.
 * All entities that we load database entities for are marked as updated or inserted.
 * To understand which of them really needs to be inserted or updated we need to load
 * their original representations from the database.
 */
class SubjectDatabaseEntityLoader {
    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor(queryRunner, subjects) {
        this.queryRunner = queryRunner;
        this.subjects = subjects;
    }
    // ---------------------------------------------------------------------
    // Public Methods
    // ---------------------------------------------------------------------
    /**
     * Loads database entities for all subjects.
     *
     * loadAllRelations flag is used to load all relation ids of the object, no matter if they present in subject entity or not.
     * This option is used for deletion.
     */
    async load(operationType) {
        // we are grouping subjects by target to perform more optimized queries using WHERE IN operator
        // go through the groups and perform loading of database entities of each subject in the group
        const promises = this.groupByEntityTargets().map(async (subjectGroup) => {
            // prepare entity ids of the subjects we need to load
            const allIds = [];
            const allSubjects = [];
            subjectGroup.subjects.forEach((subject) => {
                // we don't load if subject already has a database entity loaded
                if (subject.databaseEntity || !subject.identifier)
                    return;
                allIds.push(subject.identifier);
                allSubjects.push(subject);
            });
            // if there no ids found (means all entities are new and have generated ids) - then nothing to load there
            if (!allIds.length)
                return;
            const loadRelationPropertyPaths = [];
            // for the save, soft-remove and recover operation
            // extract all property paths of the relations we need to load relation ids for
            // this is for optimization purpose - this way we don't load relation ids for entities
            // whose relations are undefined, and since they are undefined its really pointless to
            // load something for them, since undefined properties are skipped by the orm
            if (operationType === "save" ||
                operationType === "soft-remove" ||
                operationType === "recover") {
                subjectGroup.subjects.forEach((subject) => {
                    // gets all relation property paths that exist in the persisted entity.
                    subject.metadata.relations.forEach((relation) => {
                        const value = relation.getEntityValue(subject.entityWithFulfilledIds);
                        if (value === undefined)
                            return;
                        if (loadRelationPropertyPaths.indexOf(relation.propertyPath) === -1)
                            loadRelationPropertyPaths.push(relation.propertyPath);
                    });
                });
            }
            else {
                // remove
                // for remove operation
                // we only need to load junction relation ids since only they are removed by cascades
                loadRelationPropertyPaths.push(...subjectGroup.subjects[0].metadata.manyToManyRelations.map((relation) => relation.propertyPath));
            }
            const findOptions = {
                loadEagerRelations: false,
                loadRelationIds: {
                    relations: loadRelationPropertyPaths,
                    disableMixedMap: true,
                },
                // the soft-deleted entities should be included in the loaded entities for recover operation
                withDeleted: true,
            };
            // load database entities for all given ids
            const entities = await this.queryRunner.manager
                .getRepository(subjectGroup.target)
                .createQueryBuilder()
                .setFindOptions(findOptions)
                .whereInIds(allIds)
                .getMany();
            // now when we have entities we need to find subject of each entity
            // and insert that entity into database entity of the found subjects
            entities.forEach((entity) => {
                const subjects = this.findByPersistEntityLike(subjectGroup.target, entity);
                subjects.forEach((subject) => {
                    subject.databaseEntity = entity;
                    if (!subject.identifier)
                        subject.identifier =
                            subject.metadata.hasAllPrimaryKeys(entity)
                                ? subject.metadata.getEntityIdMap(entity)
                                : undefined;
                });
            });
            // this way we tell what subjects we tried to load database entities of
            for (let subject of allSubjects) {
                subject.databaseEntityLoaded = true;
            }
        });
        await Promise.all(promises);
    }
    // ---------------------------------------------------------------------
    // Protected Methods
    // ---------------------------------------------------------------------
    /**
     * Finds subjects where entity like given subject's entity.
     * Comparison made by entity id.
     * Multiple subjects may be returned if duplicates are present in the subject array.
     * This will likely result in the same row being updated multiple times during a transaction.
     */
    findByPersistEntityLike(entityTarget, entity) {
        return this.subjects.filter((subject) => {
            if (!subject.entity)
                return false;
            if (subject.entity === entity)
                return true;
            return (subject.metadata.target === entityTarget &&
                subject.metadata.compareEntities(subject.entityWithFulfilledIds, entity));
        });
    }
    /**
     * Groups given Subject objects into groups separated by entity targets.
     */
    groupByEntityTargets() {
        return this.subjects.reduce((groups, operatedEntity) => {
            let group = groups.find((group) => group.target === operatedEntity.metadata.target);
            if (!group) {
                group = { target: operatedEntity.metadata.target, subjects: [] };
                groups.push(group);
            }
            group.subjects.push(operatedEntity);
            return groups;
        }, []);
    }
}
exports.SubjectDatabaseEntityLoader = SubjectDatabaseEntityLoader;

//# sourceMappingURL=SubjectDatabaseEntityLoader.js.map
