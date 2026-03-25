"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaterializedPathSubjectExecutor = void 0;
const OrmUtils_1 = require("../../util/OrmUtils");
const EntityMetadata_1 = require("../../metadata/EntityMetadata");
const Brackets_1 = require("../../query-builder/Brackets");
/**
 * Executes subject operations for materialized-path tree entities.
 */
class MaterializedPathSubjectExecutor {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(queryRunner) {
        this.queryRunner = queryRunner;
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Executes operations when subject is being inserted.
     */
    async insert(subject) {
        let parent = subject.metadata.treeParentRelation.getEntityValue(subject.entity); // if entity was attached via parent
        if (!parent && subject.parentSubject && subject.parentSubject.entity)
            // if entity was attached via children
            parent = subject.parentSubject.insertedValueSet
                ? subject.parentSubject.insertedValueSet
                : subject.parentSubject.entity;
        const parentId = subject.metadata.getEntityIdMap(parent);
        let parentPath = "";
        if (parentId) {
            parentPath = await this.getEntityPath(subject, parentId);
        }
        const insertedEntityId = subject.metadata
            .treeParentRelation.joinColumns.map((joinColumn) => {
            return joinColumn.referencedColumn.getEntityValue(subject.insertedValueSet);
        })
            .join("_");
        await this.queryRunner.manager
            .createQueryBuilder()
            .update(subject.metadata.target)
            .set({
            [subject.metadata.materializedPathColumn.propertyPath]: parentPath + insertedEntityId + ".",
        })
            .where(subject.identifier)
            .execute();
    }
    /**
     * Executes operations when subject is being updated.
     */
    async update(subject) {
        let newParent = subject.metadata.treeParentRelation.getEntityValue(subject.entity); // if entity was attached via parent
        if (!newParent && subject.parentSubject && subject.parentSubject.entity)
            // if entity was attached via children
            newParent = subject.parentSubject.entity;
        let entity = subject.databaseEntity; // if entity was attached via parent
        if (!entity && newParent)
            // if entity was attached via children
            entity = subject.metadata
                .treeChildrenRelation.getEntityValue(newParent)
                .find((child) => {
                return Object.entries(subject.identifier).every(([key, value]) => child[key] === value);
            });
        const oldParent = subject.metadata.treeParentRelation.getEntityValue(entity);
        const oldParentId = this.getEntityParentReferencedColumnMap(subject, oldParent);
        const newParentId = this.getEntityParentReferencedColumnMap(subject, newParent);
        // Exit if the new and old parents are the same
        if (OrmUtils_1.OrmUtils.compareIds(oldParentId, newParentId)) {
            return;
        }
        let newParentPath = "";
        if (newParentId) {
            newParentPath = await this.getEntityPath(subject, newParentId);
        }
        let oldParentPath = "";
        if (oldParentId) {
            oldParentPath =
                (await this.getEntityPath(subject, oldParentId)) || "";
        }
        const entityPath = subject.metadata
            .treeParentRelation.joinColumns.map((joinColumn) => {
            return joinColumn.referencedColumn.getEntityValue(entity);
        })
            .join("_");
        const propertyPath = subject.metadata.materializedPathColumn.propertyPath;
        await this.queryRunner.manager
            .createQueryBuilder()
            .update(subject.metadata.target)
            .set({
            [propertyPath]: () => `REPLACE(${this.queryRunner.connection.driver.escape(propertyPath)}, '${oldParentPath}${entityPath}.', '${newParentPath}${entityPath}.')`,
        })
            .where(`${propertyPath} LIKE :path`, {
            path: `${oldParentPath}${entityPath}.%`,
        })
            .execute();
    }
    getEntityParentReferencedColumnMap(subject, entity) {
        if (!entity)
            return undefined;
        return EntityMetadata_1.EntityMetadata.getValueMap(entity, subject.metadata
            .treeParentRelation.joinColumns.map((column) => column.referencedColumn)
            .filter((v) => v != null), { skipNulls: true });
    }
    getEntityPath(subject, id) {
        const metadata = subject.metadata;
        const normalized = (Array.isArray(id) ? id : [id]).map((id) => metadata.ensureEntityIdMap(id));
        return this.queryRunner.manager
            .createQueryBuilder()
            .select(subject.metadata.targetName +
            "." +
            subject.metadata.materializedPathColumn.propertyPath, "path")
            .from(subject.metadata.target, subject.metadata.targetName)
            .where(new Brackets_1.Brackets((qb) => {
            for (const data of normalized) {
                qb.orWhere(new Brackets_1.Brackets((qb) => qb.where(data)));
            }
        }))
            .getRawOne()
            .then((result) => (result ? result["path"] : ""));
    }
}
exports.MaterializedPathSubjectExecutor = MaterializedPathSubjectExecutor;

//# sourceMappingURL=MaterializedPathSubjectExecutor.js.map
