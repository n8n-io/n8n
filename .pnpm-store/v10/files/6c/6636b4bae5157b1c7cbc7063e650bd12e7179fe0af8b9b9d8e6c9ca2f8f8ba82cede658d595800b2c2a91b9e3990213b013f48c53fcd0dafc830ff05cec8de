"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TreeRepository = void 0;
const DriverUtils_1 = require("../driver/DriverUtils");
const TypeORMError_1 = require("../error/TypeORMError");
const FindOptionsUtils_1 = require("../find-options/FindOptionsUtils");
const TreeRepositoryUtils_1 = require("../util/TreeRepositoryUtils");
const Repository_1 = require("./Repository");
/**
 * Repository with additional functions to work with trees.
 *
 * @see Repository
 */
class TreeRepository extends Repository_1.Repository {
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Gets complete trees for all roots in the table.
     */
    async findTrees(options) {
        const roots = await this.findRoots(options);
        await Promise.all(roots.map((root) => this.findDescendantsTree(root, options)));
        return roots;
    }
    /**
     * Roots are entities that have no ancestors. Finds them all.
     */
    findRoots(options) {
        const escapeAlias = (alias) => this.manager.connection.driver.escape(alias);
        const escapeColumn = (column) => this.manager.connection.driver.escape(column);
        const joinColumn = this.metadata.treeParentRelation.joinColumns[0];
        const parentPropertyName = joinColumn.givenDatabaseName || joinColumn.databaseName;
        const qb = this.createQueryBuilder("treeEntity");
        FindOptionsUtils_1.FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, options);
        return qb
            .where(`${escapeAlias("treeEntity")}.${escapeColumn(parentPropertyName)} IS NULL`)
            .getMany();
    }
    /**
     * Gets all children (descendants) of the given entity. Returns them all in a flat array.
     */
    findDescendants(entity, options) {
        const qb = this.createDescendantsQueryBuilder("treeEntity", "treeClosure", entity);
        FindOptionsUtils_1.FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, options);
        return qb.getMany();
    }
    /**
     * Gets all children (descendants) of the given entity. Returns them in a tree - nested into each other.
     */
    async findDescendantsTree(entity, options) {
        // todo: throw exception if there is no column of this relation?
        const qb = this.createDescendantsQueryBuilder("treeEntity", "treeClosure", entity);
        FindOptionsUtils_1.FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, options);
        const entities = await qb.getRawAndEntities();
        const relationMaps = TreeRepositoryUtils_1.TreeRepositoryUtils.createRelationMaps(this.manager, this.metadata, "treeEntity", entities.raw);
        TreeRepositoryUtils_1.TreeRepositoryUtils.buildChildrenEntityTree(this.metadata, entity, entities.entities, relationMaps, {
            depth: -1,
            ...options,
        });
        return entity;
    }
    /**
     * Gets number of descendants of the entity.
     */
    countDescendants(entity) {
        return this.createDescendantsQueryBuilder("treeEntity", "treeClosure", entity).getCount();
    }
    /**
     * Creates a query builder used to get descendants of the entities in a tree.
     */
    createDescendantsQueryBuilder(alias, closureTableAlias, entity) {
        // create shortcuts for better readability
        const escape = (alias) => this.manager.connection.driver.escape(alias);
        if (this.metadata.treeType === "closure-table") {
            const joinCondition = this.metadata.closureJunctionTable.descendantColumns
                .map((column) => {
                return (escape(closureTableAlias) +
                    "." +
                    escape(column.propertyPath) +
                    " = " +
                    escape(alias) +
                    "." +
                    escape(column.referencedColumn.propertyPath));
            })
                .join(" AND ");
            const parameters = {};
            const whereCondition = this.metadata.closureJunctionTable.ancestorColumns
                .map((column) => {
                parameters[column.referencedColumn.propertyName] =
                    column.referencedColumn.getEntityValue(entity);
                return (escape(closureTableAlias) +
                    "." +
                    escape(column.propertyPath) +
                    " = :" +
                    column.referencedColumn.propertyName);
            })
                .join(" AND ");
            return this.createQueryBuilder(alias)
                .innerJoin(this.metadata.closureJunctionTable.tableName, closureTableAlias, joinCondition)
                .where(whereCondition)
                .setParameters(parameters);
        }
        else if (this.metadata.treeType === "nested-set") {
            const whereCondition = alias +
                "." +
                this.metadata.nestedSetLeftColumn.propertyPath +
                " BETWEEN " +
                "joined." +
                this.metadata.nestedSetLeftColumn.propertyPath +
                " AND joined." +
                this.metadata.nestedSetRightColumn.propertyPath;
            const parameters = {};
            const joinCondition = this.metadata
                .treeParentRelation.joinColumns.map((joinColumn) => {
                const parameterName = joinColumn.referencedColumn.propertyPath.replace(".", "_");
                parameters[parameterName] =
                    joinColumn.referencedColumn.getEntityValue(entity);
                return ("joined." +
                    joinColumn.referencedColumn.propertyPath +
                    " = :" +
                    parameterName);
            })
                .join(" AND ");
            return this.createQueryBuilder(alias)
                .innerJoin(this.metadata.targetName, "joined", whereCondition)
                .where(joinCondition, parameters);
        }
        else if (this.metadata.treeType === "materialized-path") {
            return this.createQueryBuilder(alias).where((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select(`${this.metadata.targetName}.${this.metadata.materializedPathColumn.propertyPath}`, "path")
                    .from(this.metadata.target, this.metadata.targetName)
                    .whereInIds(this.metadata.getEntityIdMap(entity));
                if (DriverUtils_1.DriverUtils.isSQLiteFamily(this.manager.connection.driver)) {
                    return `${alias}.${this.metadata.materializedPathColumn.propertyPath} LIKE ${subQuery.getQuery()} || '%'`;
                }
                else {
                    return `${alias}.${this.metadata.materializedPathColumn.propertyPath} LIKE NULLIF(CONCAT(${subQuery.getQuery()}, '%'), '%')`;
                }
            });
        }
        throw new TypeORMError_1.TypeORMError(`Supported only in tree entities`);
    }
    /**
     * Gets all parents (ancestors) of the given entity. Returns them all in a flat array.
     */
    findAncestors(entity, options) {
        const qb = this.createAncestorsQueryBuilder("treeEntity", "treeClosure", entity);
        FindOptionsUtils_1.FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, options);
        return qb.getMany();
    }
    /**
     * Gets all parents (ancestors) of the given entity. Returns them in a tree - nested into each other.
     */
    async findAncestorsTree(entity, options) {
        // todo: throw exception if there is no column of this relation?
        const qb = this.createAncestorsQueryBuilder("treeEntity", "treeClosure", entity);
        FindOptionsUtils_1.FindOptionsUtils.applyOptionsToTreeQueryBuilder(qb, options);
        const entities = await qb.getRawAndEntities();
        const relationMaps = TreeRepositoryUtils_1.TreeRepositoryUtils.createRelationMaps(this.manager, this.metadata, "treeEntity", entities.raw);
        TreeRepositoryUtils_1.TreeRepositoryUtils.buildParentEntityTree(this.metadata, entity, entities.entities, relationMaps);
        return entity;
    }
    /**
     * Gets number of ancestors of the entity.
     */
    countAncestors(entity) {
        return this.createAncestorsQueryBuilder("treeEntity", "treeClosure", entity).getCount();
    }
    /**
     * Creates a query builder used to get ancestors of the entities in the tree.
     */
    createAncestorsQueryBuilder(alias, closureTableAlias, entity) {
        // create shortcuts for better readability
        // const escape = (alias: string) => this.manager.connection.driver.escape(alias);
        if (this.metadata.treeType === "closure-table") {
            const joinCondition = this.metadata.closureJunctionTable.ancestorColumns
                .map((column) => {
                return (closureTableAlias +
                    "." +
                    column.propertyPath +
                    " = " +
                    alias +
                    "." +
                    column.referencedColumn.propertyPath);
            })
                .join(" AND ");
            const parameters = {};
            const whereCondition = this.metadata.closureJunctionTable.descendantColumns
                .map((column) => {
                parameters[column.referencedColumn.propertyName] =
                    column.referencedColumn.getEntityValue(entity);
                return (closureTableAlias +
                    "." +
                    column.propertyPath +
                    " = :" +
                    column.referencedColumn.propertyName);
            })
                .join(" AND ");
            return this.createQueryBuilder(alias)
                .innerJoin(this.metadata.closureJunctionTable.tableName, closureTableAlias, joinCondition)
                .where(whereCondition)
                .setParameters(parameters);
        }
        else if (this.metadata.treeType === "nested-set") {
            const joinCondition = "joined." +
                this.metadata.nestedSetLeftColumn.propertyPath +
                " BETWEEN " +
                alias +
                "." +
                this.metadata.nestedSetLeftColumn.propertyPath +
                " AND " +
                alias +
                "." +
                this.metadata.nestedSetRightColumn.propertyPath;
            const parameters = {};
            const whereCondition = this.metadata
                .treeParentRelation.joinColumns.map((joinColumn) => {
                const parameterName = joinColumn.referencedColumn.propertyPath.replace(".", "_");
                parameters[parameterName] =
                    joinColumn.referencedColumn.getEntityValue(entity);
                return ("joined." +
                    joinColumn.referencedColumn.propertyPath +
                    " = :" +
                    parameterName);
            })
                .join(" AND ");
            return this.createQueryBuilder(alias)
                .innerJoin(this.metadata.targetName, "joined", joinCondition)
                .where(whereCondition, parameters);
        }
        else if (this.metadata.treeType === "materialized-path") {
            // example: SELECT * FROM category category WHERE (SELECT mpath FROM `category` WHERE id = 2) LIKE CONCAT(category.mpath, '%');
            return this.createQueryBuilder(alias).where((qb) => {
                const subQuery = qb
                    .subQuery()
                    .select(`${this.metadata.targetName}.${this.metadata.materializedPathColumn.propertyPath}`, "path")
                    .from(this.metadata.target, this.metadata.targetName)
                    .whereInIds(this.metadata.getEntityIdMap(entity));
                if (DriverUtils_1.DriverUtils.isSQLiteFamily(this.manager.connection.driver)) {
                    return `${subQuery.getQuery()} LIKE ${alias}.${this.metadata.materializedPathColumn.propertyPath} || '%'`;
                }
                else {
                    return `${subQuery.getQuery()} LIKE CONCAT(${alias}.${this.metadata.materializedPathColumn.propertyPath}, '%')`;
                }
            });
        }
        throw new TypeORMError_1.TypeORMError(`Supported only in tree entities`);
    }
}
exports.TreeRepository = TreeRepository;

//# sourceMappingURL=TreeRepository.js.map
