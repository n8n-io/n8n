"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestedSetSubjectExecutor = void 0;
const OrmUtils_1 = require("../../util/OrmUtils");
const NestedSetMultipleRootError_1 = require("../../error/NestedSetMultipleRootError");
class NestedSetIds {
}
/**
 * Executes subject operations for nested set tree entities.
 */
class NestedSetSubjectExecutor {
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
        const escape = (alias) => this.queryRunner.connection.driver.escape(alias);
        const tableName = this.getTableName(subject.metadata.tablePath);
        const leftColumnName = escape(subject.metadata.nestedSetLeftColumn.databaseName);
        const rightColumnName = escape(subject.metadata.nestedSetRightColumn.databaseName);
        let parent = subject.metadata.treeParentRelation.getEntityValue(subject.entity); // if entity was attached via parent
        if (!parent && subject.parentSubject && subject.parentSubject.entity)
            // if entity was attached via children
            parent = subject.parentSubject.insertedValueSet
                ? subject.parentSubject.insertedValueSet
                : subject.parentSubject.entity;
        const parentId = subject.metadata.getEntityIdMap(parent);
        let parentNsRight = undefined;
        if (parentId) {
            parentNsRight = await this.queryRunner.manager
                .createQueryBuilder()
                .select(subject.metadata.targetName +
                "." +
                subject.metadata.nestedSetRightColumn.propertyPath, "right")
                .from(subject.metadata.target, subject.metadata.targetName)
                .whereInIds(parentId)
                .getRawOne()
                .then((result) => {
                const value = result ? result["right"] : undefined;
                // CockroachDB returns numeric types as string
                return typeof value === "string" ? parseInt(value) : value;
            });
        }
        if (parentNsRight !== undefined) {
            await this.queryRunner.query(`UPDATE ${tableName} SET ` +
                `${leftColumnName} = CASE WHEN ${leftColumnName} > ${parentNsRight} THEN ${leftColumnName} + 2 ELSE ${leftColumnName} END,` +
                `${rightColumnName} = ${rightColumnName} + 2 ` +
                `WHERE ${rightColumnName} >= ${parentNsRight}`);
            OrmUtils_1.OrmUtils.mergeDeep(subject.insertedValueSet, subject.metadata.nestedSetLeftColumn.createValueMap(parentNsRight), subject.metadata.nestedSetRightColumn.createValueMap(parentNsRight + 1));
        }
        else {
            const isUniqueRoot = await this.isUniqueRootEntity(subject, parent);
            // Validate if a root entity already exits and throw an exception
            if (!isUniqueRoot)
                throw new NestedSetMultipleRootError_1.NestedSetMultipleRootError();
            OrmUtils_1.OrmUtils.mergeDeep(subject.insertedValueSet, subject.metadata.nestedSetLeftColumn.createValueMap(1), subject.metadata.nestedSetRightColumn.createValueMap(2));
        }
    }
    /**
     * Executes operations when subject is being updated.
     */
    async update(subject) {
        let parent = subject.metadata.treeParentRelation.getEntityValue(subject.entity); // if entity was attached via parent
        if (!parent && subject.parentSubject && subject.parentSubject.entity)
            // if entity was attached via children
            parent = subject.parentSubject.entity;
        let entity = subject.databaseEntity; // if entity was attached via parent
        if (!entity && parent)
            // if entity was attached via children
            entity = subject.metadata
                .treeChildrenRelation.getEntityValue(parent)
                .find((child) => {
                return Object.entries(subject.identifier).every(([key, value]) => child[key] === value);
            });
        // Exit if the parent or the entity where never set
        if (entity === undefined || parent === undefined) {
            return;
        }
        const oldParent = subject.metadata.treeParentRelation.getEntityValue(entity);
        const oldParentId = subject.metadata.getEntityIdMap(oldParent);
        const parentId = subject.metadata.getEntityIdMap(parent);
        // Exit if the new and old parents are the same
        if (OrmUtils_1.OrmUtils.compareIds(oldParentId, parentId)) {
            return;
        }
        if (parent) {
            const escape = (alias) => this.queryRunner.connection.driver.escape(alias);
            const tableName = this.getTableName(subject.metadata.tablePath);
            const leftColumnName = escape(subject.metadata.nestedSetLeftColumn.databaseName);
            const rightColumnName = escape(subject.metadata.nestedSetRightColumn.databaseName);
            const entityId = subject.metadata.getEntityIdMap(entity);
            let entityNs = undefined;
            if (entityId) {
                entityNs = (await this.getNestedSetIds(subject.metadata, entityId))[0];
            }
            let parentNs = undefined;
            if (parentId) {
                parentNs = (await this.getNestedSetIds(subject.metadata, parentId))[0];
            }
            if (entityNs !== undefined && parentNs !== undefined) {
                const isMovingUp = parentNs.left > entityNs.left;
                const treeSize = entityNs.right - entityNs.left + 1;
                let entitySize;
                if (isMovingUp) {
                    entitySize = parentNs.left - entityNs.right;
                }
                else {
                    entitySize = parentNs.right - entityNs.left;
                }
                // Moved entity logic
                const updateLeftSide = `WHEN ${leftColumnName} >= ${entityNs.left} AND ` +
                    `${leftColumnName} < ${entityNs.right} ` +
                    `THEN ${leftColumnName} + ${entitySize} `;
                const updateRightSide = `WHEN ${rightColumnName} > ${entityNs.left} AND ` +
                    `${rightColumnName} <= ${entityNs.right} ` +
                    `THEN ${rightColumnName} + ${entitySize} `;
                // Update the surrounding entities
                if (isMovingUp) {
                    await this.queryRunner.query(`UPDATE ${tableName} ` +
                        `SET ${leftColumnName} = CASE ` +
                        `WHEN ${leftColumnName} > ${entityNs.right} AND ` +
                        `${leftColumnName} <= ${parentNs.left} ` +
                        `THEN ${leftColumnName} - ${treeSize} ` +
                        updateLeftSide +
                        `ELSE ${leftColumnName} ` +
                        `END, ` +
                        `${rightColumnName} = CASE ` +
                        `WHEN ${rightColumnName} > ${entityNs.right} AND ` +
                        `${rightColumnName} < ${parentNs.left} ` +
                        `THEN ${rightColumnName} - ${treeSize} ` +
                        updateRightSide +
                        `ELSE ${rightColumnName} ` +
                        `END`);
                }
                else {
                    await this.queryRunner.query(`UPDATE ${tableName} ` +
                        `SET ${leftColumnName} = CASE ` +
                        `WHEN ${leftColumnName} < ${entityNs.left} AND ` +
                        `${leftColumnName} > ${parentNs.right} ` +
                        `THEN ${leftColumnName} + ${treeSize} ` +
                        updateLeftSide +
                        `ELSE ${leftColumnName} ` +
                        `END, ` +
                        `${rightColumnName} = CASE ` +
                        `WHEN ${rightColumnName} < ${entityNs.left} AND ` +
                        `${rightColumnName} >= ${parentNs.right} ` +
                        `THEN ${rightColumnName} + ${treeSize} ` +
                        updateRightSide +
                        `ELSE ${rightColumnName} ` +
                        `END`);
                }
            }
        }
        else {
            const isUniqueRoot = await this.isUniqueRootEntity(subject, parent);
            // Validate if a root entity already exits and throw an exception
            if (!isUniqueRoot)
                throw new NestedSetMultipleRootError_1.NestedSetMultipleRootError();
        }
    }
    /**
     * Executes operations when subject is being removed.
     */
    async remove(subjects) {
        if (!Array.isArray(subjects))
            subjects = [subjects];
        const metadata = subjects[0].metadata;
        const escape = (alias) => this.queryRunner.connection.driver.escape(alias);
        const tableName = this.getTableName(metadata.tablePath);
        const leftColumnName = escape(metadata.nestedSetLeftColumn.databaseName);
        const rightColumnName = escape(metadata.nestedSetRightColumn.databaseName);
        let entitiesIds = [];
        for (const subject of subjects) {
            const entityId = metadata.getEntityIdMap(subject.entity);
            if (entityId) {
                entitiesIds.push(entityId);
            }
        }
        let entitiesNs = await this.getNestedSetIds(metadata, entitiesIds);
        for (const entity of entitiesNs) {
            const treeSize = entity.right - entity.left + 1;
            await this.queryRunner.query(`UPDATE ${tableName} ` +
                `SET ${leftColumnName} = CASE ` +
                `WHEN ${leftColumnName} > ${entity.left} THEN ${leftColumnName} - ${treeSize} ` +
                `ELSE ${leftColumnName} ` +
                `END, ` +
                `${rightColumnName} = CASE ` +
                `WHEN ${rightColumnName} > ${entity.right} THEN ${rightColumnName} - ${treeSize} ` +
                `ELSE ${rightColumnName} ` +
                `END`);
        }
    }
    /**
     * Get the nested set ids for a given entity
     */
    getNestedSetIds(metadata, ids) {
        const select = {
            left: `${metadata.targetName}.${metadata.nestedSetLeftColumn.propertyPath}`,
            right: `${metadata.targetName}.${metadata.nestedSetRightColumn.propertyPath}`,
        };
        const queryBuilder = this.queryRunner.manager.createQueryBuilder();
        Object.entries(select).forEach(([key, value]) => {
            queryBuilder.addSelect(value, key);
        });
        return queryBuilder
            .from(metadata.target, metadata.targetName)
            .whereInIds(ids)
            .orderBy(select.right, "DESC")
            .getRawMany()
            .then((results) => {
            const data = [];
            for (const result of results) {
                const entry = {};
                for (const key of Object.keys(select)) {
                    const value = result ? result[key] : undefined;
                    // CockroachDB returns numeric types as string
                    entry[key] =
                        typeof value === "string" ? parseInt(value) : value;
                }
                data.push(entry);
            }
            return data;
        });
    }
    async isUniqueRootEntity(subject, parent) {
        const escape = (alias) => this.queryRunner.connection.driver.escape(alias);
        const tableName = this.getTableName(subject.metadata.tablePath);
        const parameters = [];
        const whereCondition = subject.metadata
            .treeParentRelation.joinColumns.map((column) => {
            const columnName = escape(column.databaseName);
            const parameter = column.getEntityValue(parent);
            if (parameter == null) {
                return `${columnName} IS NULL`;
            }
            parameters.push(parameter);
            const parameterName = this.queryRunner.connection.driver.createParameter("entity_" + column.databaseName, parameters.length - 1);
            return `${columnName} = ${parameterName}`;
        })
            .join(" AND ");
        const countAlias = "count";
        const result = await this.queryRunner.query(`SELECT COUNT(1) AS ${escape(countAlias)} FROM ${tableName} WHERE ${whereCondition}`, parameters, true);
        return parseInt(result.records[0][countAlias]) === 0;
    }
    /**
     * Gets escaped table name with schema name if SqlServer or Postgres driver used with custom
     * schema name, otherwise returns escaped table name.
     */
    getTableName(tablePath) {
        return tablePath
            .split(".")
            .map((i) => {
            // this condition need because in SQL Server driver when custom database name was specified and schema name was not, we got `dbName..tableName` string, and doesn't need to escape middle empty string
            return i === ""
                ? i
                : this.queryRunner.connection.driver.escape(i);
        })
            .join(".");
    }
}
exports.NestedSetSubjectExecutor = NestedSetSubjectExecutor;

//# sourceMappingURL=NestedSetSubjectExecutor.js.map
