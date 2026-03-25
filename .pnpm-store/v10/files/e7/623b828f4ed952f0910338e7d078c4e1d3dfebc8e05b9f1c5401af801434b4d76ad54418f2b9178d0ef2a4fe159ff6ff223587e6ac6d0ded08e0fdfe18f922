"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SubjectExecutor = void 0;
const SubjectTopoligicalSorter_1 = require("./SubjectTopoligicalSorter");
const SubjectChangedColumnsComputer_1 = require("./SubjectChangedColumnsComputer");
const SubjectWithoutIdentifierError_1 = require("../error/SubjectWithoutIdentifierError");
const SubjectRemovedAndUpdatedError_1 = require("../error/SubjectRemovedAndUpdatedError");
const BroadcasterResult_1 = require("../subscriber/BroadcasterResult");
const NestedSetSubjectExecutor_1 = require("./tree/NestedSetSubjectExecutor");
const ClosureSubjectExecutor_1 = require("./tree/ClosureSubjectExecutor");
const MaterializedPathSubjectExecutor_1 = require("./tree/MaterializedPathSubjectExecutor");
const ObjectUtils_1 = require("../util/ObjectUtils");
/**
 * Executes all database operations (inserts, updated, deletes) that must be executed
 * with given persistence subjects.
 */
class SubjectExecutor {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(queryRunner, subjects, options) {
        // -------------------------------------------------------------------------
        // Public Properties
        // -------------------------------------------------------------------------
        /**
         * Indicates if executor has any operations to execute (e.g. has insert / update / delete operations to be executed).
         */
        this.hasExecutableOperations = false;
        /**
         * Subjects that must be inserted.
         */
        this.insertSubjects = [];
        /**
         * Subjects that must be updated.
         */
        this.updateSubjects = [];
        /**
         * Subjects that must be removed.
         */
        this.removeSubjects = [];
        /**
         * Subjects that must be soft-removed.
         */
        this.softRemoveSubjects = [];
        /**
         * Subjects that must be recovered.
         */
        this.recoverSubjects = [];
        this.queryRunner = queryRunner;
        this.allSubjects = subjects;
        this.options = options;
        this.validate();
        this.recompute();
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Executes all operations over given array of subjects.
     * Executes queries using given query runner.
     */
    async execute() {
        // console.time("SubjectExecutor.execute");
        // broadcast "before" events before we start insert / update / remove operations
        let broadcasterResult = undefined;
        if (!this.options || this.options.listeners !== false) {
            // console.time(".broadcastBeforeEventsForAll");
            broadcasterResult = this.broadcastBeforeEventsForAll();
            if (broadcasterResult.promises.length > 0)
                await Promise.all(broadcasterResult.promises);
            // console.timeEnd(".broadcastBeforeEventsForAll");
        }
        // since event listeners and subscribers can call save methods and/or trigger entity changes we need to recompute operational subjects
        // recompute only in the case if any listener or subscriber was really executed
        if (broadcasterResult && broadcasterResult.count > 0) {
            // console.time(".recompute");
            this.insertSubjects.forEach((subject) => subject.recompute());
            this.updateSubjects.forEach((subject) => subject.recompute());
            this.removeSubjects.forEach((subject) => subject.recompute());
            this.softRemoveSubjects.forEach((subject) => subject.recompute());
            this.recoverSubjects.forEach((subject) => subject.recompute());
            this.recompute();
            // console.timeEnd(".recompute");
        }
        // make sure our insert subjects are sorted (using topological sorting) to make cascade inserts work properly
        // console.timeEnd("prepare");
        // execute all insert operations
        // console.time(".insertion");
        this.insertSubjects = new SubjectTopoligicalSorter_1.SubjectTopoligicalSorter(this.insertSubjects).sort("insert");
        await this.executeInsertOperations();
        // console.timeEnd(".insertion");
        // recompute update operations since insertion can create updation operations for the
        // properties it wasn't able to handle on its own (referenced columns)
        this.updateSubjects = this.allSubjects.filter((subject) => subject.mustBeUpdated);
        // execute update operations
        // console.time(".updation");
        await this.executeUpdateOperations();
        // console.timeEnd(".updation");
        // make sure our remove subjects are sorted (using topological sorting) when multiple entities are passed for the removal
        // console.time(".removal");
        this.removeSubjects = new SubjectTopoligicalSorter_1.SubjectTopoligicalSorter(this.removeSubjects).sort("delete");
        await this.executeRemoveOperations();
        // console.timeEnd(".removal");
        // recompute soft-remove operations
        this.softRemoveSubjects = this.allSubjects.filter((subject) => subject.mustBeSoftRemoved);
        // execute soft-remove operations
        await this.executeSoftRemoveOperations();
        // recompute recover operations
        this.recoverSubjects = this.allSubjects.filter((subject) => subject.mustBeRecovered);
        // execute recover operations
        await this.executeRecoverOperations();
        // update all special columns in persisted entities, like inserted id or remove ids from the removed entities
        // console.time(".updateSpecialColumnsInPersistedEntities");
        this.updateSpecialColumnsInPersistedEntities();
        // console.timeEnd(".updateSpecialColumnsInPersistedEntities");
        // finally broadcast "after" events after we finish insert / update / remove operations
        if (!this.options || this.options.listeners !== false) {
            // console.time(".broadcastAfterEventsForAll");
            broadcasterResult = this.broadcastAfterEventsForAll();
            if (broadcasterResult.promises.length > 0)
                await Promise.all(broadcasterResult.promises);
            // console.timeEnd(".broadcastAfterEventsForAll");
        }
        // console.timeEnd("SubjectExecutor.execute");
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Validates all given subjects.
     */
    validate() {
        this.allSubjects.forEach((subject) => {
            if (subject.mustBeUpdated && subject.mustBeRemoved)
                throw new SubjectRemovedAndUpdatedError_1.SubjectRemovedAndUpdatedError(subject);
        });
    }
    /**
     * Performs entity re-computations - finds changed columns, re-builds insert/update/remove subjects.
     */
    recompute() {
        new SubjectChangedColumnsComputer_1.SubjectChangedColumnsComputer().compute(this.allSubjects);
        this.insertSubjects = this.allSubjects.filter((subject) => subject.mustBeInserted);
        this.updateSubjects = this.allSubjects.filter((subject) => subject.mustBeUpdated);
        this.removeSubjects = this.allSubjects.filter((subject) => subject.mustBeRemoved);
        this.softRemoveSubjects = this.allSubjects.filter((subject) => subject.mustBeSoftRemoved);
        this.recoverSubjects = this.allSubjects.filter((subject) => subject.mustBeRecovered);
        this.hasExecutableOperations =
            this.insertSubjects.length > 0 ||
                this.updateSubjects.length > 0 ||
                this.removeSubjects.length > 0 ||
                this.softRemoveSubjects.length > 0 ||
                this.recoverSubjects.length > 0;
    }
    /**
     * Broadcasts "BEFORE_INSERT", "BEFORE_UPDATE", "BEFORE_REMOVE", "BEFORE_SOFT_REMOVE", "BEFORE_RECOVER" events for all given subjects.
     */
    broadcastBeforeEventsForAll() {
        const result = new BroadcasterResult_1.BroadcasterResult();
        if (this.insertSubjects.length)
            this.insertSubjects.forEach((subject) => this.queryRunner.broadcaster.broadcastBeforeInsertEvent(result, subject.metadata, subject.entity));
        if (this.updateSubjects.length)
            this.updateSubjects.forEach((subject) => this.queryRunner.broadcaster.broadcastBeforeUpdateEvent(result, subject.metadata, subject.entity, subject.databaseEntity, subject.diffColumns, subject.diffRelations));
        if (this.removeSubjects.length)
            this.removeSubjects.forEach((subject) => this.queryRunner.broadcaster.broadcastBeforeRemoveEvent(result, subject.metadata, subject.entity, subject.databaseEntity, subject.identifier));
        if (this.softRemoveSubjects.length)
            this.softRemoveSubjects.forEach((subject) => this.queryRunner.broadcaster.broadcastBeforeSoftRemoveEvent(result, subject.metadata, subject.entity, subject.databaseEntity, subject.identifier));
        if (this.recoverSubjects.length)
            this.recoverSubjects.forEach((subject) => this.queryRunner.broadcaster.broadcastBeforeRecoverEvent(result, subject.metadata, subject.entity, subject.databaseEntity, subject.identifier));
        return result;
    }
    /**
     * Broadcasts "AFTER_INSERT", "AFTER_UPDATE", "AFTER_REMOVE", "AFTER_SOFT_REMOVE", "AFTER_RECOVER" events for all given subjects.
     * Returns void if there wasn't any listener or subscriber executed.
     * Note: this method has a performance-optimized code organization.
     */
    broadcastAfterEventsForAll() {
        const result = new BroadcasterResult_1.BroadcasterResult();
        if (this.insertSubjects.length)
            this.insertSubjects.forEach((subject) => this.queryRunner.broadcaster.broadcastAfterInsertEvent(result, subject.metadata, subject.entity, subject.identifier));
        if (this.updateSubjects.length)
            this.updateSubjects.forEach((subject) => this.queryRunner.broadcaster.broadcastAfterUpdateEvent(result, subject.metadata, subject.entity, subject.databaseEntity, subject.diffColumns, subject.diffRelations));
        if (this.removeSubjects.length)
            this.removeSubjects.forEach((subject) => this.queryRunner.broadcaster.broadcastAfterRemoveEvent(result, subject.metadata, subject.entity, subject.databaseEntity, subject.identifier));
        if (this.softRemoveSubjects.length)
            this.softRemoveSubjects.forEach((subject) => this.queryRunner.broadcaster.broadcastAfterSoftRemoveEvent(result, subject.metadata, subject.entity, subject.databaseEntity, subject.identifier));
        if (this.recoverSubjects.length)
            this.recoverSubjects.forEach((subject) => this.queryRunner.broadcaster.broadcastAfterRecoverEvent(result, subject.metadata, subject.entity, subject.databaseEntity, subject.identifier));
        return result;
    }
    /**
     * Executes insert operations.
     */
    async executeInsertOperations() {
        // group insertion subjects to make bulk insertions
        const [groupedInsertSubjects, groupedInsertSubjectKeys] = this.groupBulkSubjects(this.insertSubjects, "insert");
        // then we run insertion in the sequential order which is important since we have an ordered subjects
        for (const groupName of groupedInsertSubjectKeys) {
            const subjects = groupedInsertSubjects[groupName];
            // we must separately insert entities which does not have any values to insert
            // because its not possible to insert multiple entities with only default values in bulk
            const bulkInsertMaps = [];
            const bulkInsertSubjects = [];
            const singleInsertSubjects = [];
            subjects.forEach((subject) => {
                // we do not insert in bulk in following cases:
                // - when there is no values in insert (only defaults are inserted), since we cannot use DEFAULT VALUES expression for multiple inserted rows
                // - when entity is a tree table, since tree tables require extra operation per each inserted row
                if (subject.changeMaps.length === 0 ||
                    subject.metadata.treeType) {
                    singleInsertSubjects.push(subject);
                }
                else {
                    bulkInsertSubjects.push(subject);
                    bulkInsertMaps.push(subject.createValueSetAndPopChangeMap());
                }
            });
            // here we execute our insertion query
            // we need to enable entity updation because we DO need to have updated insertedMap
            // which is not same object as our entity that's why we don't need to worry about our entity to get dirty
            // also, we disable listeners because we call them on our own in persistence layer
            if (bulkInsertMaps.length > 0) {
                const insertResult = await this.queryRunner.manager
                    .createQueryBuilder()
                    .insert()
                    .into(subjects[0].metadata.target)
                    .values(bulkInsertMaps)
                    .updateEntity(this.options && this.options.reload === false
                    ? false
                    : true)
                    .callListeners(false)
                    .execute();
                bulkInsertSubjects.forEach((subject, index) => {
                    subject.identifier = insertResult.identifiers[index];
                    subject.generatedMap = insertResult.generatedMaps[index];
                    subject.insertedValueSet = bulkInsertMaps[index];
                });
            }
            // insert subjects which must be inserted in separate requests (all default values)
            if (singleInsertSubjects.length > 0) {
                for (const subject of singleInsertSubjects) {
                    subject.insertedValueSet =
                        subject.createValueSetAndPopChangeMap(); // important to have because query builder sets inserted values into it
                    // for nested set we execute additional queries
                    if (subject.metadata.treeType === "nested-set")
                        await new NestedSetSubjectExecutor_1.NestedSetSubjectExecutor(this.queryRunner).insert(subject);
                    await this.queryRunner.manager
                        .createQueryBuilder()
                        .insert()
                        .into(subject.metadata.target)
                        .values(subject.insertedValueSet)
                        .updateEntity(this.options && this.options.reload === false
                        ? false
                        : true)
                        .callListeners(false)
                        .execute()
                        .then((insertResult) => {
                        subject.identifier = insertResult.identifiers[0];
                        subject.generatedMap = insertResult.generatedMaps[0];
                    });
                    // for tree tables we execute additional queries
                    if (subject.metadata.treeType === "closure-table") {
                        await new ClosureSubjectExecutor_1.ClosureSubjectExecutor(this.queryRunner).insert(subject);
                    }
                    else if (subject.metadata.treeType === "materialized-path") {
                        await new MaterializedPathSubjectExecutor_1.MaterializedPathSubjectExecutor(this.queryRunner).insert(subject);
                    }
                }
            }
            subjects.forEach((subject) => {
                if (subject.generatedMap) {
                    subject.metadata.columns.forEach((column) => {
                        const value = column.getEntityValue(subject.generatedMap);
                        if (value !== undefined && value !== null) {
                            const preparedValue = this.queryRunner.connection.driver.prepareHydratedValue(value, column);
                            column.setEntityValue(subject.generatedMap, preparedValue);
                        }
                    });
                }
            });
        }
    }
    /**
     * Updates all given subjects in the database.
     */
    async executeUpdateOperations() {
        const updateSubject = async (subject) => {
            if (!subject.identifier)
                throw new SubjectWithoutIdentifierError_1.SubjectWithoutIdentifierError(subject);
            const updateMap = subject.createValueSetAndPopChangeMap();
            // for tree tables we execute additional queries
            switch (subject.metadata.treeType) {
                case "nested-set":
                    await new NestedSetSubjectExecutor_1.NestedSetSubjectExecutor(this.queryRunner).update(subject);
                    break;
                case "closure-table":
                    await new ClosureSubjectExecutor_1.ClosureSubjectExecutor(this.queryRunner).update(subject);
                    break;
                case "materialized-path":
                    await new MaterializedPathSubjectExecutor_1.MaterializedPathSubjectExecutor(this.queryRunner).update(subject);
                    break;
            }
            // here we execute our updation query
            // we need to enable entity updation because we update a subject identifier
            // which is not same object as our entity that's why we don't need to worry about our entity to get dirty
            // also, we disable listeners because we call them on our own in persistence layer
            const updateQueryBuilder = this.queryRunner.manager
                .createQueryBuilder()
                .update(subject.metadata.target)
                .set(updateMap)
                .updateEntity(this.options && this.options.reload === false
                ? false
                : true)
                .callListeners(false);
            if (subject.entity) {
                updateQueryBuilder.whereEntity(subject.identifier);
            }
            else {
                // in this case identifier is just conditions object to update by
                updateQueryBuilder.where(subject.identifier);
            }
            const updateResult = await updateQueryBuilder.execute();
            let updateGeneratedMap = updateResult.generatedMaps[0];
            if (updateGeneratedMap) {
                subject.metadata.columns.forEach((column) => {
                    const value = column.getEntityValue(updateGeneratedMap);
                    if (value !== undefined && value !== null) {
                        const preparedValue = this.queryRunner.connection.driver.prepareHydratedValue(value, column);
                        column.setEntityValue(updateGeneratedMap, preparedValue);
                    }
                });
                if (!subject.generatedMap) {
                    subject.generatedMap = {};
                }
                Object.assign(subject.generatedMap, updateGeneratedMap);
            }
        };
        // Nested sets need to be updated one by one
        // Split array in two, one with nested set subjects and the other with the remaining subjects
        const nestedSetSubjects = [];
        const remainingSubjects = [];
        for (const subject of this.updateSubjects) {
            if (subject.metadata.treeType === "nested-set") {
                nestedSetSubjects.push(subject);
            }
            else {
                remainingSubjects.push(subject);
            }
        }
        // Run nested set updates one by one
        const nestedSetPromise = new Promise(async (ok, fail) => {
            for (const subject of nestedSetSubjects) {
                try {
                    await updateSubject(subject);
                }
                catch (error) {
                    fail(error);
                }
            }
            ok();
        });
        // Run all remaining subjects in parallel
        await Promise.all([
            ...remainingSubjects.map(updateSubject),
            nestedSetPromise,
        ]);
    }
    /**
     * Removes all given subjects from the database.
     *
     * todo: we need to apply topological sort here as well
     */
    async executeRemoveOperations() {
        // group insertion subjects to make bulk insertions
        const [groupedRemoveSubjects, groupedRemoveSubjectKeys] = this.groupBulkSubjects(this.removeSubjects, "delete");
        for (const groupName of groupedRemoveSubjectKeys) {
            const subjects = groupedRemoveSubjects[groupName];
            const deleteMaps = subjects.map((subject) => {
                if (!subject.identifier)
                    throw new SubjectWithoutIdentifierError_1.SubjectWithoutIdentifierError(subject);
                return subject.identifier;
            });
            // for tree tables we execute additional queries
            switch (subjects[0].metadata.treeType) {
                case "nested-set":
                    await new NestedSetSubjectExecutor_1.NestedSetSubjectExecutor(this.queryRunner).remove(subjects);
                    break;
                case "closure-table":
                    await new ClosureSubjectExecutor_1.ClosureSubjectExecutor(this.queryRunner).remove(subjects);
                    break;
            }
            // here we execute our deletion query
            // we don't need to specify entities and set update entity to true since the only thing query builder
            // will do for use is a primary keys deletion which is handled by us later once persistence is finished
            // also, we disable listeners because we call them on our own in persistence layer
            await this.queryRunner.manager
                .createQueryBuilder()
                .delete()
                .from(subjects[0].metadata.target)
                .where(deleteMaps)
                .callListeners(false)
                .execute();
        }
    }
    /**
     * Soft-removes all given subjects in the database.
     */
    async executeSoftRemoveOperations() {
        await Promise.all(this.softRemoveSubjects.map(async (subject) => {
            if (!subject.identifier)
                throw new SubjectWithoutIdentifierError_1.SubjectWithoutIdentifierError(subject);
            let updateResult;
            // here we execute our soft-deletion query
            // we need to enable entity soft-deletion because we update a subject identifier
            // which is not same object as our entity that's why we don't need to worry about our entity to get dirty
            // also, we disable listeners because we call them on our own in persistence layer
            const softDeleteQueryBuilder = this.queryRunner.manager
                .createQueryBuilder()
                .softDelete()
                .from(subject.metadata.target)
                .updateEntity(this.options && this.options.reload === false
                ? false
                : true)
                .callListeners(false);
            if (subject.entity) {
                softDeleteQueryBuilder.whereEntity(subject.identifier);
            }
            else {
                // in this case identifier is just conditions object to update by
                softDeleteQueryBuilder.where(subject.identifier);
            }
            updateResult = await softDeleteQueryBuilder.execute();
            subject.generatedMap = updateResult.generatedMaps[0];
            if (subject.generatedMap) {
                subject.metadata.columns.forEach((column) => {
                    const value = column.getEntityValue(subject.generatedMap);
                    if (value !== undefined && value !== null) {
                        const preparedValue = this.queryRunner.connection.driver.prepareHydratedValue(value, column);
                        column.setEntityValue(subject.generatedMap, preparedValue);
                    }
                });
            }
            // experiments, remove probably, need to implement tree tables children removal
            // if (subject.updatedRelationMaps.length > 0) {
            //     await Promise.all(subject.updatedRelationMaps.map(async updatedRelation => {
            //         if (!updatedRelation.relation.isTreeParent) return;
            //         if (!updatedRelation.value !== null) return;
            //
            //         if (subject.metadata.treeType === "closure-table") {
            //             await new ClosureSubjectExecutor(this.queryRunner).deleteChildrenOf(subject);
            //         }
            //     }));
            // }
        }));
    }
    /**
     * Recovers all given subjects in the database.
     */
    async executeRecoverOperations() {
        await Promise.all(this.recoverSubjects.map(async (subject) => {
            if (!subject.identifier)
                throw new SubjectWithoutIdentifierError_1.SubjectWithoutIdentifierError(subject);
            let updateResult;
            // here we execute our restory query
            // we need to enable entity restory because we update a subject identifier
            // which is not same object as our entity that's why we don't need to worry about our entity to get dirty
            // also, we disable listeners because we call them on our own in persistence layer
            const softDeleteQueryBuilder = this.queryRunner.manager
                .createQueryBuilder()
                .restore()
                .from(subject.metadata.target)
                .updateEntity(this.options && this.options.reload === false
                ? false
                : true)
                .callListeners(false);
            if (subject.entity) {
                softDeleteQueryBuilder.whereEntity(subject.identifier);
            }
            else {
                // in this case identifier is just conditions object to update by
                softDeleteQueryBuilder.where(subject.identifier);
            }
            updateResult = await softDeleteQueryBuilder.execute();
            subject.generatedMap = updateResult.generatedMaps[0];
            if (subject.generatedMap) {
                subject.metadata.columns.forEach((column) => {
                    const value = column.getEntityValue(subject.generatedMap);
                    if (value !== undefined && value !== null) {
                        const preparedValue = this.queryRunner.connection.driver.prepareHydratedValue(value, column);
                        column.setEntityValue(subject.generatedMap, preparedValue);
                    }
                });
            }
            // experiments, remove probably, need to implement tree tables children removal
            // if (subject.updatedRelationMaps.length > 0) {
            //     await Promise.all(subject.updatedRelationMaps.map(async updatedRelation => {
            //         if (!updatedRelation.relation.isTreeParent) return;
            //         if (!updatedRelation.value !== null) return;
            //
            //         if (subject.metadata.treeType === "closure-table") {
            //             await new ClosureSubjectExecutor(this.queryRunner).deleteChildrenOf(subject);
            //         }
            //     }));
            // }
        }));
    }
    /**
     * Updates all special columns of the saving entities (create date, update date, version, etc.).
     * Also updates nullable columns and columns with default values.
     */
    updateSpecialColumnsInPersistedEntities() {
        // update inserted entity properties
        if (this.insertSubjects.length)
            this.updateSpecialColumnsInInsertedAndUpdatedEntities(this.insertSubjects);
        // update updated entity properties
        if (this.updateSubjects.length)
            this.updateSpecialColumnsInInsertedAndUpdatedEntities(this.updateSubjects);
        // update soft-removed entity properties
        if (this.softRemoveSubjects.length)
            this.updateSpecialColumnsInInsertedAndUpdatedEntities(this.softRemoveSubjects);
        // update recovered entity properties
        if (this.recoverSubjects.length)
            this.updateSpecialColumnsInInsertedAndUpdatedEntities(this.recoverSubjects);
        // remove ids from the entities that were removed
        if (this.removeSubjects.length) {
            this.removeSubjects.forEach((subject) => {
                if (!subject.entity)
                    return;
                subject.metadata.primaryColumns.forEach((primaryColumn) => {
                    primaryColumn.setEntityValue(subject.entity, undefined);
                });
            });
        }
        // other post-persist updations
        this.allSubjects.forEach((subject) => {
            if (!subject.entity)
                return;
            subject.metadata.relationIds.forEach((relationId) => {
                relationId.setValue(subject.entity);
            });
        });
    }
    /**
     * Updates all special columns of the saving entities (create date, update date, version, etc.).
     * Also updates nullable columns and columns with default values.
     */
    updateSpecialColumnsInInsertedAndUpdatedEntities(subjects) {
        subjects.forEach((subject) => {
            if (!subject.entity)
                return;
            // set values to "null" for nullable columns that did not have values
            subject.metadata.columns.forEach((column) => {
                // if table inheritance is used make sure this column is not child's column
                if (subject.metadata.childEntityMetadatas.length > 0 &&
                    subject.metadata.childEntityMetadatas
                        .map((metadata) => metadata.target)
                        .indexOf(column.target) !== -1)
                    return;
                // entities does not have virtual columns
                if (column.isVirtual)
                    return;
                // if column is deletedAt
                if (column.isDeleteDate)
                    return;
                // update nullable columns
                if (column.isNullable) {
                    const columnValue = column.getEntityValue(subject.entity);
                    if (columnValue === undefined)
                        column.setEntityValue(subject.entity, null);
                }
                // update relational columns
                if (subject.updatedRelationMaps.length > 0) {
                    subject.updatedRelationMaps.forEach((updatedRelationMap) => {
                        updatedRelationMap.relation.joinColumns.forEach((column) => {
                            if (column.isVirtual === true)
                                return;
                            column.setEntityValue(subject.entity, ObjectUtils_1.ObjectUtils.isObject(updatedRelationMap.value)
                                ? column.referencedColumn.getEntityValue(updatedRelationMap.value)
                                : updatedRelationMap.value);
                        });
                    });
                }
            });
            // merge into entity all generated values returned by a database
            if (subject.generatedMap)
                this.queryRunner.manager.merge(subject.metadata.target, subject.entity, subject.generatedMap);
        });
    }
    /**
     * Groups subjects by metadata names (by tables) to make bulk insertions and deletions possible.
     * However there are some limitations with bulk insertions of data into tables with generated (increment) columns
     * in some drivers. Some drivers like mysql and sqlite does not support returning multiple generated columns
     * after insertion and can only return a single generated column value, that's why its not possible to do bulk insertion,
     * because it breaks insertion result's generatedMap and leads to problems when this subject is used in other subjects saves.
     * That's why we only support bulking in junction tables for those drivers.
     *
     * Other drivers like postgres and sql server support RETURNING / OUTPUT statement which allows to return generated
     * id for each inserted row, that's why bulk insertion is not limited to junction tables in there.
     */
    groupBulkSubjects(subjects, type) {
        const group = {};
        const keys = [];
        const hasReturningDependColumns = subjects.some((subject) => {
            return subject.metadata.getInsertionReturningColumns().length > 0;
        });
        const groupingAllowed = type === "delete" ||
            this.queryRunner.connection.driver.isReturningSqlSupported("insert") ||
            hasReturningDependColumns === false;
        subjects.forEach((subject, index) => {
            const key = groupingAllowed || subject.metadata.isJunction
                ? subject.metadata.name
                : subject.metadata.name + "_" + index;
            if (!group[key]) {
                group[key] = [subject];
                keys.push(key);
            }
            else {
                group[key].push(subject);
            }
        });
        return [group, keys];
    }
}
exports.SubjectExecutor = SubjectExecutor;

//# sourceMappingURL=SubjectExecutor.js.map
