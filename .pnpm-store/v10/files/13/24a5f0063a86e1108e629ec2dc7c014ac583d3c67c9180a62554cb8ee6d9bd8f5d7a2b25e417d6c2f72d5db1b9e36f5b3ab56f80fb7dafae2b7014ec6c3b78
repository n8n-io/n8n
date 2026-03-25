"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityMetadataValidator = void 0;
const MissingPrimaryColumnError_1 = require("../error/MissingPrimaryColumnError");
const CircularRelationsError_1 = require("../error/CircularRelationsError");
const DepGraph_1 = require("../util/DepGraph");
const DataTypeNotSupportedError_1 = require("../error/DataTypeNotSupportedError");
const NoConnectionOptionError_1 = require("../error/NoConnectionOptionError");
const InitializedRelationError_1 = require("../error/InitializedRelationError");
const error_1 = require("../error");
const DriverUtils_1 = require("../driver/DriverUtils");
/// todo: add check if there are multiple tables with the same name
/// todo: add checks when generated column / table names are too long for the specific driver
// todo: type in function validation, inverse side function validation
// todo: check on build for duplicate names, since naming checking was removed from MetadataStorage
// todo: duplicate name checking for: table, relation, column, index, naming strategy, join tables/columns?
// todo: check if multiple tree parent metadatas in validator
// todo: tree decorators can be used only on closure table (validation)
// todo: throw error if parent tree metadata was not specified in a closure table
// todo: MetadataArgsStorage: type in function validation, inverse side function validation
// todo: MetadataArgsStorage: check on build for duplicate names, since naming checking was removed from MetadataStorage
// todo: MetadataArgsStorage: duplicate name checking for: table, relation, column, index, naming strategy, join tables/columns?
// todo: MetadataArgsStorage: check for duplicate targets too since this check has been removed too
// todo: check if relation decorator contains primary: true and nullable: true
// todo: check column length, precision. scale
// todo: MySQL index can be unique or spatial or fulltext
/**
 * Validates built entity metadatas.
 */
class EntityMetadataValidator {
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Validates all given entity metadatas.
     */
    validateMany(entityMetadatas, driver) {
        entityMetadatas.forEach((entityMetadata) => this.validate(entityMetadata, entityMetadatas, driver));
        this.validateDependencies(entityMetadatas);
        this.validateEagerRelations(entityMetadatas);
    }
    /**
     * Validates given entity metadata.
     */
    validate(entityMetadata, allEntityMetadatas, driver) {
        // check if table metadata has an id
        if (!entityMetadata.primaryColumns.length && !entityMetadata.isJunction)
            throw new MissingPrimaryColumnError_1.MissingPrimaryColumnError(entityMetadata);
        // if entity has multiple primary keys and uses custom constraint name,
        // then all primary keys should have the same constraint name
        if (entityMetadata.primaryColumns.length > 1) {
            const areConstraintNamesEqual = entityMetadata.primaryColumns.every((columnMetadata, i, columnMetadatas) => columnMetadata.primaryKeyConstraintName ===
                columnMetadatas[0].primaryKeyConstraintName);
            if (!areConstraintNamesEqual) {
                throw new error_1.TypeORMError(`Entity ${entityMetadata.name} has multiple primary columns with different constraint names. Constraint names should be the equal.`);
            }
        }
        // validate if table is using inheritance it has a discriminator
        // also validate if discriminator values are not empty and not repeated
        if (entityMetadata.inheritancePattern === "STI" ||
            entityMetadata.tableType === "entity-child") {
            if (!entityMetadata.discriminatorColumn)
                throw new error_1.TypeORMError(`Entity ${entityMetadata.name} using single-table inheritance, it should also have a discriminator column. Did you forget to put discriminator column options?`);
            if (typeof entityMetadata.discriminatorValue === "undefined")
                throw new error_1.TypeORMError(`Entity ${entityMetadata.name} has an undefined discriminator value. Discriminator value should be defined.`);
            const sameDiscriminatorValueEntityMetadata = allEntityMetadatas.find((metadata) => {
                return (metadata !== entityMetadata &&
                    (metadata.inheritancePattern === "STI" ||
                        metadata.tableType === "entity-child") &&
                    metadata.tableName === entityMetadata.tableName &&
                    metadata.discriminatorValue ===
                        entityMetadata.discriminatorValue &&
                    metadata.inheritanceTree.some((parent) => entityMetadata.inheritanceTree.indexOf(parent) !== -1));
            });
            if (sameDiscriminatorValueEntityMetadata)
                throw new error_1.TypeORMError(`Entities ${entityMetadata.name} and ${sameDiscriminatorValueEntityMetadata.name} have the same discriminator values. Make sure they are different while using the @ChildEntity decorator.`);
        }
        entityMetadata.relationCounts.forEach((relationCount) => {
            if (relationCount.relation.isManyToOne ||
                relationCount.relation.isOneToOne)
                throw new error_1.TypeORMError(`Relation count can not be implemented on ManyToOne or OneToOne relations.`);
        });
        entityMetadata.columns
            .filter((column) => !column.isVirtualProperty)
            .forEach((column) => {
            const normalizedColumn = driver.normalizeType(column);
            if (driver.supportedDataTypes.indexOf(normalizedColumn) === -1)
                throw new DataTypeNotSupportedError_1.DataTypeNotSupportedError(column, normalizedColumn, driver.options.type);
            if (column.length &&
                driver.withLengthColumnTypes.indexOf(normalizedColumn) ===
                    -1)
                throw new error_1.TypeORMError(`Column ${column.propertyName} of Entity ${entityMetadata.name} does not support length property.`);
            if (column.type === "enum" && !column.enum && !column.enumName)
                throw new error_1.TypeORMError(`Column "${column.propertyName}" of Entity "${entityMetadata.name}" is defined as enum, but missing "enum" or "enumName" properties.`);
        });
        if (DriverUtils_1.DriverUtils.isMySQLFamily(driver)) {
            const generatedColumns = entityMetadata.columns.filter((column) => column.isGenerated && column.generationStrategy !== "uuid");
            if (generatedColumns.length > 1)
                throw new error_1.TypeORMError(`Error in ${entityMetadata.name} entity. There can be only one auto-increment column in MySql table.`);
        }
        // for mysql we are able to not define a default selected database, instead all entities can have their database
        // defined in their decorators. To make everything work either all entities must have database define and we
        // can live without database set in the connection options, either database in the connection options must be set
        if (DriverUtils_1.DriverUtils.isMySQLFamily(driver)) {
            const metadatasWithDatabase = allEntityMetadatas.filter((metadata) => metadata.database);
            if (metadatasWithDatabase.length === 0 && !driver.database)
                throw new NoConnectionOptionError_1.NoConnectionOptionError("database");
        }
        // Postgres supports only STORED generated columns.
        if (driver.options.type === "postgres") {
            const virtualColumn = entityMetadata.columns.find((column) => column.asExpression &&
                (!column.generatedType ||
                    column.generatedType === "VIRTUAL"));
            if (virtualColumn)
                throw new error_1.TypeORMError(`Column "${virtualColumn.propertyName}" of Entity "${entityMetadata.name}" is defined as VIRTUAL, but Postgres supports only STORED generated columns.`);
        }
        // check if relations are all without initialized properties
        const entityInstance = entityMetadata.create(undefined, {
            fromDeserializer: true,
        });
        entityMetadata.relations.forEach((relation) => {
            if (relation.isManyToMany || relation.isOneToMany) {
                // we skip relations for which persistence is disabled since initialization in them cannot harm somehow
                if (relation.persistenceEnabled === false)
                    return;
                // get entity relation value and check if its an array
                const relationInitializedValue = relation.getEntityValue(entityInstance);
                if (Array.isArray(relationInitializedValue))
                    throw new InitializedRelationError_1.InitializedRelationError(relation);
            }
        });
        // validate relations
        entityMetadata.relations.forEach((relation) => {
            // check OnDeleteTypes
            if (driver.supportedOnDeleteTypes &&
                relation.onDelete &&
                !driver.supportedOnDeleteTypes.includes(relation.onDelete)) {
                throw new error_1.TypeORMError(`OnDeleteType "${relation.onDelete}" is not supported for ${driver.options.type}!`);
            }
            // check OnUpdateTypes
            if (driver.supportedOnUpdateTypes &&
                relation.onUpdate &&
                !driver.supportedOnUpdateTypes.includes(relation.onUpdate)) {
                throw new error_1.TypeORMError(`OnUpdateType "${relation.onUpdate}" is not valid for ${driver.options.type}!`);
            }
            // check join tables:
            // using JoinTable is possible only on one side of the many-to-many relation
            // todo(dima): fix
            // if (relation.joinTable) {
            //     if (!relation.isManyToMany)
            //         throw new UsingJoinTableIsNotAllowedError(entityMetadata, relation);
            //     // if there is inverse side of the relation, then check if it does not have join table too
            //     if (relation.hasInverseSide && relation.inverseRelation.joinTable)
            //         throw new UsingJoinTableOnlyOnOneSideAllowedError(entityMetadata, relation);
            // }
            // check join columns:
            // using JoinColumn is possible only on one side of the relation and on one-to-one, many-to-one relation types
            // first check if relation is one-to-one or many-to-one
            // todo(dima): fix
            /*if (relation.joinColumn) {

                // join column can be applied only on one-to-one and many-to-one relations
                if (!relation.isOneToOne && !relation.isManyToOne)
                    throw new UsingJoinColumnIsNotAllowedError(entityMetadata, relation);

                // if there is inverse side of the relation, then check if it does not have join table too
                if (relation.hasInverseSide && relation.inverseRelation.joinColumn && relation.isOneToOne)
                    throw new UsingJoinColumnOnlyOnOneSideAllowedError(entityMetadata, relation);

                // check if join column really has referenced column
                if (relation.joinColumn && !relation.joinColumn.referencedColumn)
                    throw new TypeORMError(`Join column does not have referenced column set`);

            }

            // if its a one-to-one relation and JoinColumn is missing on both sides of the relation
            // or its one-side relation without JoinColumn we should give an error
            if (!relation.joinColumn && relation.isOneToOne && (!relation.hasInverseSide || !relation.inverseRelation.joinColumn))
                throw new MissingJoinColumnError(entityMetadata, relation);*/
            // if its a many-to-many relation and JoinTable is missing on both sides of the relation
            // or its one-side relation without JoinTable we should give an error
            // todo(dima): fix it
            // if (!relation.joinTable && relation.isManyToMany && (!relation.hasInverseSide || !relation.inverseRelation.joinTable))
            //     throw new MissingJoinTableError(entityMetadata, relation);
            // todo: validate if its one-to-one and side which does not have join column MUST have inverse side
            // todo: validate if its many-to-many and side which does not have join table MUST have inverse side
            // todo: if there is a relation, and inverse side is specified only on one side, shall we give error
            // todo: with message like: "Inverse side is specified only on one side of the relationship. Specify on other side too to prevent confusion".
            // todo: add validation if there two entities with the same target, and show error message with description of the problem (maybe file was renamed/moved but left in output directory)
            // todo: check if there are multiple columns on the same column applied.
            // todo: check column type if is missing in relational databases (throw new TypeORMError(`Column type of ${type} cannot be determined.`);)
            // todo: include driver-specific checks. for example in mongodb empty prefixes are not allowed
            // todo: if multiple columns with same name - throw exception, including cases when columns are in embeds with same prefixes or without prefix at all
            // todo: if multiple primary key used, at least one of them must be unique or @Index decorator must be set on entity
            // todo: check if entity with duplicate names, some decorators exist
        });
        // make sure cascade remove is not set for both sides of relationships (can be set in OneToOne decorators)
        entityMetadata.relations.forEach((relation) => {
            const isCircularCascadeRemove = relation.isCascadeRemove &&
                relation.inverseRelation &&
                relation.inverseRelation.isCascadeRemove;
            if (isCircularCascadeRemove)
                throw new error_1.TypeORMError(`Relation ${entityMetadata.name}#${relation.propertyName} and ${relation.inverseRelation.entityMetadata.name}#${relation.inverseRelation.propertyName} both has cascade remove set. ` +
                    `This may lead to unexpected circular removals. Please set cascade remove only from one side of relationship.`);
        }); // todo: maybe better just deny removal from one to one relation without join column?
        entityMetadata.eagerRelations.forEach((relation) => { });
    }
    /**
     * Validates dependencies of the entity metadatas.
     */
    validateDependencies(entityMetadatas) {
        const graph = new DepGraph_1.DepGraph();
        entityMetadatas.forEach((entityMetadata) => {
            graph.addNode(entityMetadata.name);
        });
        entityMetadatas.forEach((entityMetadata) => {
            entityMetadata.relationsWithJoinColumns
                .filter((relation) => !relation.isNullable)
                .forEach((relation) => {
                graph.addDependency(entityMetadata.name, relation.inverseEntityMetadata.name);
            });
        });
        try {
            graph.overallOrder();
        }
        catch (err) {
            throw new CircularRelationsError_1.CircularRelationsError(err.toString().replace("Error: Dependency Cycle Found: ", ""));
        }
    }
    /**
     * Validates eager relations to prevent circular dependency in them.
     */
    validateEagerRelations(entityMetadatas) {
        entityMetadatas.forEach((entityMetadata) => {
            entityMetadata.eagerRelations.forEach((relation) => {
                if (relation.inverseRelation &&
                    relation.inverseRelation.isEager)
                    throw new error_1.TypeORMError(`Circular eager relations are disallowed. ` +
                        `${entityMetadata.targetName}#${relation.propertyPath} contains "eager: true", and its inverse side ` +
                        `${relation.inverseEntityMetadata.targetName}#${relation.inverseRelation.propertyPath} contains "eager: true" as well.` +
                        ` Remove "eager: true" from one side of the relation.`);
            });
        });
    }
}
exports.EntityMetadataValidator = EntityMetadataValidator;

//# sourceMappingURL=EntityMetadataValidator.js.map
