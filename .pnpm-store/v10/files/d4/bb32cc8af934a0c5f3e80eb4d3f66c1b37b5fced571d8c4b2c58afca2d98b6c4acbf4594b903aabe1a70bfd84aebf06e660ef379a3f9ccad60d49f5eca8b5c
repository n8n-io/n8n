"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClosureSubjectExecutor = void 0;
const CannotAttachTreeChildrenEntityError_1 = require("../../error/CannotAttachTreeChildrenEntityError");
const OrmUtils_1 = require("../../util/OrmUtils");
/**
 * Executes subject operations for closure entities.
 */
class ClosureSubjectExecutor {
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
        // create values to be inserted into the closure junction
        const closureJunctionInsertMap = {};
        subject.metadata.closureJunctionTable.ancestorColumns.forEach((column) => {
            closureJunctionInsertMap[column.databaseName] =
                subject.identifier;
        });
        subject.metadata.closureJunctionTable.descendantColumns.forEach((column) => {
            closureJunctionInsertMap[column.databaseName] =
                subject.identifier;
        });
        // insert values into the closure junction table
        await this.queryRunner.manager
            .createQueryBuilder()
            .insert()
            .into(subject.metadata.closureJunctionTable.tablePath)
            .values(closureJunctionInsertMap)
            .updateEntity(false)
            .callListeners(false)
            .execute();
        let parent = subject.metadata.treeParentRelation.getEntityValue(subject.entity); // if entity was attached via parent
        if (!parent && subject.parentSubject && subject.parentSubject.entity)
            // if entity was attached via children
            parent = subject.parentSubject.insertedValueSet
                ? subject.parentSubject.insertedValueSet
                : subject.parentSubject.entity;
        if (parent) {
            const escape = (alias) => this.queryRunner.connection.driver.escape(alias);
            const tableName = this.getTableName(subject.metadata.closureJunctionTable.tablePath);
            const queryParams = [];
            const ancestorColumnNames = subject.metadata.closureJunctionTable.ancestorColumns.map((column) => {
                return escape(column.databaseName);
            });
            const descendantColumnNames = subject.metadata.closureJunctionTable.descendantColumns.map((column) => {
                return escape(column.databaseName);
            });
            const childEntityIds1 = subject.metadata.primaryColumns.map((column) => {
                queryParams.push(column.getEntityValue(subject.insertedValueSet
                    ? subject.insertedValueSet
                    : subject.entity));
                return this.queryRunner.connection.driver.createParameter("child_entity_" + column.databaseName, queryParams.length - 1);
            });
            const whereCondition = subject.metadata.closureJunctionTable.descendantColumns.map((column) => {
                const columnName = escape(column.databaseName);
                const parentId = column.referencedColumn.getEntityValue(parent);
                if (!parentId)
                    throw new CannotAttachTreeChildrenEntityError_1.CannotAttachTreeChildrenEntityError(subject.metadata.name);
                queryParams.push(parentId);
                const parameterName = this.queryRunner.connection.driver.createParameter("parent_entity_" +
                    column.referencedColumn.databaseName, queryParams.length - 1);
                return `${columnName} = ${parameterName}`;
            });
            await this.queryRunner.query(`INSERT INTO ${tableName} (${[
                ...ancestorColumnNames,
                ...descendantColumnNames,
            ].join(", ")}) ` +
                `SELECT ${ancestorColumnNames.join(", ")}, ${childEntityIds1.join(", ")} FROM ${tableName} WHERE ${whereCondition.join(" AND ")}`, queryParams);
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
        const escape = (alias) => this.queryRunner.connection.driver.escape(alias);
        const closureTable = subject.metadata.closureJunctionTable;
        const ancestorColumnNames = closureTable.ancestorColumns.map((column) => {
            return escape(column.databaseName);
        });
        const descendantColumnNames = closureTable.descendantColumns.map((column) => {
            return escape(column.databaseName);
        });
        // Delete logic
        const createSubQuery = (qb, alias) => {
            const subAlias = `sub${alias}`;
            const subSelect = qb
                .createQueryBuilder()
                .select(descendantColumnNames.join(", "))
                .from(closureTable.tablePath, subAlias);
            // Create where conditions e.g. (WHERE "subdescendant"."id_ancestor" = :value_id)
            for (const column of closureTable.ancestorColumns) {
                subSelect.andWhere(`${escape(subAlias)}.${escape(column.databaseName)} = :value_${column.referencedColumn.databaseName}`);
            }
            return qb
                .createQueryBuilder()
                .select(descendantColumnNames.join(", "))
                .from(`(${subSelect.getQuery()})`, alias)
                .setParameters(subSelect.getParameters())
                .getQuery();
        };
        const parameters = {};
        for (const column of subject.metadata.primaryColumns) {
            parameters[`value_${column.databaseName}`] =
                entity[column.databaseName];
        }
        await this.queryRunner.manager
            .createQueryBuilder()
            .delete()
            .from(closureTable.tablePath)
            .where((qb) => `(${descendantColumnNames.join(", ")}) IN (${createSubQuery(qb, "descendant")})`)
            .andWhere((qb) => `(${ancestorColumnNames.join(", ")}) NOT IN (${createSubQuery(qb, "ancestor")})`)
            .setParameters(parameters)
            .execute();
        /**
         * Only insert new parent if it exits
         *
         * This only happens if the entity doesn't become a root entity
         */
        if (parent) {
            // Insert logic
            const queryParams = [];
            const tableName = this.getTableName(closureTable.tablePath);
            const superAlias = escape("supertree");
            const subAlias = escape("subtree");
            const select = [
                ...ancestorColumnNames.map((columnName) => `${superAlias}.${columnName}`),
                ...descendantColumnNames.map((columnName) => `${subAlias}.${columnName}`),
            ];
            const entityWhereCondition = subject.metadata.closureJunctionTable.ancestorColumns.map((column) => {
                const columnName = escape(column.databaseName);
                const entityId = column.referencedColumn.getEntityValue(entity);
                queryParams.push(entityId);
                const parameterName = this.queryRunner.connection.driver.createParameter("entity_" +
                    column.referencedColumn.databaseName, queryParams.length - 1);
                return `${subAlias}.${columnName} = ${parameterName}`;
            });
            const parentWhereCondition = subject.metadata.closureJunctionTable.descendantColumns.map((column) => {
                const columnName = escape(column.databaseName);
                const parentId = column.referencedColumn.getEntityValue(parent);
                if (!parentId)
                    throw new CannotAttachTreeChildrenEntityError_1.CannotAttachTreeChildrenEntityError(subject.metadata.name);
                queryParams.push(parentId);
                const parameterName = this.queryRunner.connection.driver.createParameter("parent_entity_" +
                    column.referencedColumn.databaseName, queryParams.length - 1);
                return `${superAlias}.${columnName} = ${parameterName}`;
            });
            await this.queryRunner.query(`INSERT INTO ${tableName} (${[
                ...ancestorColumnNames,
                ...descendantColumnNames,
            ].join(", ")}) ` +
                `SELECT ${select.join(", ")} ` +
                `FROM ${tableName} AS ${superAlias}, ${tableName} AS ${subAlias} ` +
                `WHERE ${[
                    ...entityWhereCondition,
                    ...parentWhereCondition,
                ].join(" AND ")}`, queryParams);
        }
    }
    /**
     * Executes operations when subject is being removed.
     */
    async remove(subjects) {
        if (!Array.isArray(subjects))
            subjects = [subjects];
        const escape = (alias) => this.queryRunner.connection.driver.escape(alias);
        const identifiers = subjects.map((subject) => subject.identifier);
        const closureTable = subjects[0].metadata.closureJunctionTable;
        const generateWheres = (columns) => {
            return columns
                .map((column) => {
                const data = identifiers.map((identifier) => identifier[column.referencedColumn.databaseName]);
                return `${escape(column.databaseName)} IN (${data.join(", ")})`;
            })
                .join(" AND ");
        };
        const ancestorWhere = generateWheres(closureTable.ancestorColumns);
        const descendantWhere = generateWheres(closureTable.descendantColumns);
        await this.queryRunner.manager
            .createQueryBuilder()
            .delete()
            .from(closureTable.tablePath)
            .where(ancestorWhere)
            .orWhere(descendantWhere)
            .execute();
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
exports.ClosureSubjectExecutor = ClosureSubjectExecutor;

//# sourceMappingURL=ClosureSubjectExecutor.js.map
