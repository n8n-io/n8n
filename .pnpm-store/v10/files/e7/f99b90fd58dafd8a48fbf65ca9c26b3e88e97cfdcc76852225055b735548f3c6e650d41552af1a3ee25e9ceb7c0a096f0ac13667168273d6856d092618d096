"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EntityMetadataBuilder = void 0;
const EntityMetadata_1 = require("../metadata/EntityMetadata");
const ColumnMetadata_1 = require("../metadata/ColumnMetadata");
const IndexMetadata_1 = require("../metadata/IndexMetadata");
const RelationMetadata_1 = require("../metadata/RelationMetadata");
const EmbeddedMetadata_1 = require("../metadata/EmbeddedMetadata");
const RelationIdMetadata_1 = require("../metadata/RelationIdMetadata");
const RelationCountMetadata_1 = require("../metadata/RelationCountMetadata");
const EventListenerTypes_1 = require("../metadata/types/EventListenerTypes");
const MetadataUtils_1 = require("./MetadataUtils");
const JunctionEntityMetadataBuilder_1 = require("./JunctionEntityMetadataBuilder");
const ClosureJunctionEntityMetadataBuilder_1 = require("./ClosureJunctionEntityMetadataBuilder");
const RelationJoinColumnBuilder_1 = require("./RelationJoinColumnBuilder");
const EntityListenerMetadata_1 = require("../metadata/EntityListenerMetadata");
const UniqueMetadata_1 = require("../metadata/UniqueMetadata");
const CheckMetadata_1 = require("../metadata/CheckMetadata");
const ExclusionMetadata_1 = require("../metadata/ExclusionMetadata");
const error_1 = require("../error");
const DriverUtils_1 = require("../driver/DriverUtils");
/**
 * Builds EntityMetadata objects and all its sub-metadatas.
 */
class EntityMetadataBuilder {
    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------
    constructor(connection, metadataArgsStorage) {
        this.connection = connection;
        this.metadataArgsStorage = metadataArgsStorage;
        this.junctionEntityMetadataBuilder = new JunctionEntityMetadataBuilder_1.JunctionEntityMetadataBuilder(connection);
        this.closureJunctionEntityMetadataBuilder =
            new ClosureJunctionEntityMetadataBuilder_1.ClosureJunctionEntityMetadataBuilder(connection);
        this.relationJoinColumnBuilder = new RelationJoinColumnBuilder_1.RelationJoinColumnBuilder(connection);
    }
    // -------------------------------------------------------------------------
    // Public Methods
    // -------------------------------------------------------------------------
    /**
     * Builds a complete entity metadatas for the given entity classes.
     */
    build(entityClasses) {
        // if entity classes to filter entities by are given then do filtering, otherwise use all
        const allTables = entityClasses
            ? this.metadataArgsStorage.filterTables(entityClasses)
            : this.metadataArgsStorage.tables;
        // filter out table metadata args for those we really create entity metadatas and tables in the db
        const realTables = allTables.filter((table) => table.type === "regular" ||
            table.type === "closure" ||
            table.type === "entity-child" ||
            table.type === "view");
        // create entity metadatas for a user defined entities (marked with @Entity decorator or loaded from entity schemas)
        const entityMetadatas = realTables.map((tableArgs) => this.createEntityMetadata(tableArgs));
        // compute parent entity metadatas for table inheritance
        entityMetadatas.forEach((entityMetadata) => this.computeParentEntityMetadata(entityMetadatas, entityMetadata));
        // after all metadatas created we set child entity metadatas for table inheritance
        entityMetadatas.forEach((metadata) => {
            metadata.childEntityMetadatas = entityMetadatas.filter((childMetadata) => {
                return (typeof metadata.target === "function" &&
                    typeof childMetadata.target === "function" &&
                    MetadataUtils_1.MetadataUtils.isInherited(childMetadata.target, metadata.target));
            });
        });
        // build entity metadata (step0), first for non-single-table-inherited entity metadatas (dependant)
        entityMetadatas
            .filter((entityMetadata) => entityMetadata.tableType !== "entity-child")
            .forEach((entityMetadata) => entityMetadata.build());
        // build entity metadata (step0), now for single-table-inherited entity metadatas (dependant)
        entityMetadatas
            .filter((entityMetadata) => entityMetadata.tableType === "entity-child")
            .forEach((entityMetadata) => entityMetadata.build());
        // compute entity metadata columns, relations, etc. first for the regular, non-single-table-inherited entity metadatas
        entityMetadatas
            .filter((entityMetadata) => entityMetadata.tableType !== "entity-child")
            .forEach((entityMetadata) => this.computeEntityMetadataStep1(entityMetadatas, entityMetadata));
        // then do it for single table inheritance children (since they are depend on their parents to be built)
        entityMetadatas
            .filter((entityMetadata) => entityMetadata.tableType === "entity-child")
            .forEach((entityMetadata) => this.computeEntityMetadataStep1(entityMetadatas, entityMetadata));
        // calculate entity metadata computed properties and all its sub-metadatas
        entityMetadatas.forEach((entityMetadata) => this.computeEntityMetadataStep2(entityMetadata));
        // calculate entity metadata's inverse properties
        entityMetadatas.forEach((entityMetadata) => this.computeInverseProperties(entityMetadata, entityMetadatas));
        // go through all entity metadatas and create foreign keys / junction entity metadatas for their relations
        entityMetadatas
            .filter((entityMetadata) => entityMetadata.tableType !== "entity-child")
            .forEach((entityMetadata) => {
            // create entity's relations join columns (for many-to-one and one-to-one owner)
            entityMetadata.relations
                .filter((relation) => relation.isOneToOne || relation.isManyToOne)
                .forEach((relation) => {
                const joinColumns = this.metadataArgsStorage.filterJoinColumns(relation.target, relation.propertyName);
                const { foreignKey, columns, uniqueConstraint } = this.relationJoinColumnBuilder.build(joinColumns, relation); // create a foreign key based on its metadata args
                if (foreignKey) {
                    relation.registerForeignKeys(foreignKey); // push it to the relation and thus register there a join column
                    entityMetadata.foreignKeys.push(foreignKey);
                }
                if (columns) {
                    relation.registerJoinColumns(columns);
                }
                if (uniqueConstraint) {
                    if (DriverUtils_1.DriverUtils.isMySQLFamily(this.connection.driver)) {
                        const index = new IndexMetadata_1.IndexMetadata({
                            entityMetadata: uniqueConstraint.entityMetadata,
                            columns: uniqueConstraint.columns,
                            args: {
                                target: uniqueConstraint.target,
                                name: uniqueConstraint.name,
                                unique: true,
                                synchronize: true,
                            },
                        });
                        if (relation.embeddedMetadata) {
                            relation.embeddedMetadata.indices.push(index);
                        }
                        else {
                            relation.entityMetadata.ownIndices.push(index);
                        }
                        this.computeEntityMetadataStep2(entityMetadata);
                    }
                    else {
                        if (relation.embeddedMetadata) {
                            relation.embeddedMetadata.uniques.push(uniqueConstraint);
                        }
                        else {
                            relation.entityMetadata.ownUniques.push(uniqueConstraint);
                        }
                        this.computeEntityMetadataStep2(entityMetadata);
                    }
                }
            });
            // create junction entity metadatas for entity many-to-many relations
            entityMetadata.relations
                .filter((relation) => relation.isManyToMany)
                .forEach((relation) => {
                const joinTable = this.metadataArgsStorage.findJoinTable(relation.target, relation.propertyName);
                if (!joinTable)
                    return; // no join table set - no need to do anything (it means this is many-to-many inverse side)
                // here we create a junction entity metadata for a new junction table of many-to-many relation
                const junctionEntityMetadata = this.junctionEntityMetadataBuilder.build(relation, joinTable);
                relation.registerForeignKeys(...junctionEntityMetadata.foreignKeys);
                relation.registerJoinColumns(junctionEntityMetadata.ownIndices[0].columns, junctionEntityMetadata.ownIndices[1].columns);
                relation.registerJunctionEntityMetadata(junctionEntityMetadata);
                // compute new entity metadata properties and push it to entity metadatas pool
                this.computeEntityMetadataStep2(junctionEntityMetadata);
                this.computeInverseProperties(junctionEntityMetadata, entityMetadatas);
                entityMetadatas.push(junctionEntityMetadata);
            });
        });
        // update entity metadata depend properties
        entityMetadatas.forEach((entityMetadata) => {
            entityMetadata.relationsWithJoinColumns =
                entityMetadata.relations.filter((relation) => relation.isWithJoinColumn);
            entityMetadata.hasNonNullableRelations =
                entityMetadata.relationsWithJoinColumns.some((relation) => !relation.isNullable || relation.isPrimary);
        });
        // generate closure junction tables for all closure tables
        entityMetadatas
            .filter((metadata) => metadata.treeType === "closure-table")
            .forEach((entityMetadata) => {
            const closureJunctionEntityMetadata = this.closureJunctionEntityMetadataBuilder.build(entityMetadata);
            entityMetadata.closureJunctionTable =
                closureJunctionEntityMetadata;
            this.computeEntityMetadataStep2(closureJunctionEntityMetadata);
            this.computeInverseProperties(closureJunctionEntityMetadata, entityMetadatas);
            entityMetadatas.push(closureJunctionEntityMetadata);
        });
        // generate keys for tables with single-table inheritance
        entityMetadatas
            .filter((metadata) => metadata.inheritancePattern === "STI" &&
            metadata.discriminatorColumn)
            .forEach((entityMetadata) => this.createKeysForTableInheritance(entityMetadata));
        // build all indices (need to do it after relations and their join columns are built)
        entityMetadatas.forEach((entityMetadata) => {
            entityMetadata.indices.forEach((index) => index.build(this.connection.namingStrategy));
        });
        // build all unique constraints (need to do it after relations and their join columns are built)
        entityMetadatas.forEach((entityMetadata) => {
            entityMetadata.uniques.forEach((unique) => unique.build(this.connection.namingStrategy));
        });
        // build all check constraints
        entityMetadatas.forEach((entityMetadata) => {
            entityMetadata.checks.forEach((check) => check.build(this.connection.namingStrategy));
        });
        // build all exclusion constraints
        entityMetadatas.forEach((entityMetadata) => {
            entityMetadata.exclusions.forEach((exclusion) => exclusion.build(this.connection.namingStrategy));
        });
        // add lazy initializer for entity relations
        entityMetadatas
            .filter((metadata) => typeof metadata.target === "function")
            .forEach((entityMetadata) => {
            entityMetadata.relations
                .filter((relation) => relation.isLazy)
                .forEach((relation) => {
                this.connection.relationLoader.enableLazyLoad(relation, entityMetadata.target.prototype);
            });
        });
        entityMetadatas.forEach((entityMetadata) => {
            entityMetadata.columns.forEach((column) => {
                // const target = column.embeddedMetadata ? column.embeddedMetadata.type : column.target;
                const generated = this.metadataArgsStorage.findGenerated(column.target, column.propertyName);
                if (generated) {
                    column.isGenerated = true;
                    column.generationStrategy = generated.strategy;
                    if (generated.strategy === "uuid") {
                        column.type = "uuid";
                    }
                    else if (generated.strategy === "rowid") {
                        column.type = "int";
                    }
                    else {
                        column.type = column.type || Number;
                    }
                    column.build(this.connection);
                    this.computeEntityMetadataStep2(entityMetadata);
                }
            });
        });
        return entityMetadatas;
    }
    // -------------------------------------------------------------------------
    // Protected Methods
    // -------------------------------------------------------------------------
    /**
     * Creates entity metadata from the given table args.
     * Creates column, relation, etc. metadatas for everything this entity metadata owns.
     */
    createEntityMetadata(tableArgs) {
        // we take all "inheritance tree" from a target entity to collect all stored metadata args
        // (by decorators or inside entity schemas). For example for target Post < ContentModel < Unit
        // it will be an array of [Post, ContentModel, Unit] and we can then get all metadata args of those classes
        const inheritanceTree = typeof tableArgs.target === "function"
            ? MetadataUtils_1.MetadataUtils.getInheritanceTree(tableArgs.target)
            : [tableArgs.target]; // todo: implement later here inheritance for string-targets
        const tableInheritance = this.metadataArgsStorage.findInheritanceType(tableArgs.target);
        const tableTree = this.metadataArgsStorage.findTree(tableArgs.target);
        // if single table inheritance used, we need to copy all children columns in to parent table
        let singleTableChildrenTargets;
        if ((tableInheritance && tableInheritance.pattern === "STI") ||
            tableArgs.type === "entity-child") {
            singleTableChildrenTargets = this.metadataArgsStorage
                .filterSingleTableChildren(tableArgs.target)
                .map((args) => args.target)
                .filter((target) => typeof target === "function");
            inheritanceTree.push(...singleTableChildrenTargets);
        }
        return new EntityMetadata_1.EntityMetadata({
            connection: this.connection,
            args: tableArgs,
            inheritanceTree: inheritanceTree,
            tableTree: tableTree,
            inheritancePattern: tableInheritance
                ? tableInheritance.pattern
                : undefined,
        });
    }
    computeParentEntityMetadata(allEntityMetadatas, entityMetadata) {
        // after all metadatas created we set parent entity metadata for table inheritance
        if (entityMetadata.tableType === "entity-child") {
            entityMetadata.parentEntityMetadata = allEntityMetadatas.find((allEntityMetadata) => {
                return (allEntityMetadata.inheritanceTree.indexOf(entityMetadata.target) !== -1 &&
                    allEntityMetadata.inheritancePattern === "STI");
            });
        }
    }
    computeEntityMetadataStep1(allEntityMetadatas, entityMetadata) {
        const entityInheritance = this.metadataArgsStorage.findInheritanceType(entityMetadata.target);
        const discriminatorValue = this.metadataArgsStorage.findDiscriminatorValue(entityMetadata.target);
        if (typeof discriminatorValue !== "undefined") {
            entityMetadata.discriminatorValue = discriminatorValue.value;
        }
        else {
            entityMetadata.discriminatorValue = entityMetadata.target.name;
        }
        // if single table inheritance is used, we need to mark all embedded columns as nullable
        entityMetadata.embeddeds = this.createEmbeddedsRecursively(entityMetadata, this.metadataArgsStorage.filterEmbeddeds(entityMetadata.inheritanceTree)).map((embedded) => {
            if (entityMetadata.inheritancePattern === "STI") {
                embedded.columns = embedded.columns.map((column) => {
                    column.isNullable = true;
                    return column;
                });
            }
            return embedded;
        });
        entityMetadata.ownColumns = this.metadataArgsStorage
            .filterColumns(entityMetadata.inheritanceTree)
            .map((args) => {
            // for single table children we reuse columns created for their parents
            if (entityMetadata.tableType === "entity-child")
                return entityMetadata.parentEntityMetadata.ownColumns.find((column) => column.propertyName === args.propertyName);
            // for multiple table inheritance we can override default column values
            if (entityMetadata.tableType === "regular" &&
                args.target !== entityMetadata.target) {
                const childArgs = this.metadataArgsStorage.columns.find((c) => c.propertyName === args.propertyName &&
                    c.target === entityMetadata.target);
                if (childArgs && childArgs.options.default) {
                    args.options.default = childArgs.options.default;
                }
            }
            const column = new ColumnMetadata_1.ColumnMetadata({
                connection: this.connection,
                entityMetadata,
                args,
            });
            // if single table inheritance used, we need to mark all inherit table columns as nullable
            const columnInSingleTableInheritedChild = allEntityMetadatas.find((otherEntityMetadata) => otherEntityMetadata.tableType === "entity-child" &&
                otherEntityMetadata.target === args.target);
            if (columnInSingleTableInheritedChild)
                column.isNullable = true;
            return column;
        });
        // for table inheritance we need to add a discriminator column
        //
        if (entityInheritance && entityInheritance.column) {
            const discriminatorColumnName = entityInheritance.column && entityInheritance.column.name
                ? entityInheritance.column.name
                : "type";
            let discriminatorColumn = entityMetadata.ownColumns.find((column) => column.propertyName === discriminatorColumnName);
            if (!discriminatorColumn) {
                discriminatorColumn = new ColumnMetadata_1.ColumnMetadata({
                    connection: this.connection,
                    entityMetadata: entityMetadata,
                    args: {
                        target: entityMetadata.target,
                        mode: "virtual",
                        propertyName: discriminatorColumnName,
                        options: entityInheritance.column || {
                            name: discriminatorColumnName,
                            type: "varchar",
                            nullable: false,
                        },
                    },
                });
                discriminatorColumn.isVirtual = true;
                discriminatorColumn.isDiscriminator = true;
                entityMetadata.ownColumns.push(discriminatorColumn);
            }
            else {
                discriminatorColumn.isDiscriminator = true;
            }
        }
        // add discriminator column to the child entity metadatas
        // discriminator column will not be there automatically since we are creating it in the code above
        if (entityMetadata.tableType === "entity-child") {
            const discriminatorColumn = entityMetadata.parentEntityMetadata.ownColumns.find((column) => column.isDiscriminator);
            if (discriminatorColumn &&
                !entityMetadata.ownColumns.find((column) => column === discriminatorColumn)) {
                entityMetadata.ownColumns.push(discriminatorColumn);
            }
            // also copy the inheritance pattern & tree metadata
            // this comes in handy when inheritance and trees are used together
            entityMetadata.inheritancePattern =
                entityMetadata.parentEntityMetadata.inheritancePattern;
            if (!entityMetadata.treeType &&
                !!entityMetadata.parentEntityMetadata.treeType) {
                entityMetadata.treeType =
                    entityMetadata.parentEntityMetadata.treeType;
                entityMetadata.treeOptions =
                    entityMetadata.parentEntityMetadata.treeOptions;
                entityMetadata.treeParentRelation =
                    entityMetadata.parentEntityMetadata.treeParentRelation;
                entityMetadata.treeLevelColumn =
                    entityMetadata.parentEntityMetadata.treeLevelColumn;
            }
        }
        const { namingStrategy } = this.connection;
        // check if tree is used then we need to add extra columns for specific tree types
        if (entityMetadata.treeType === "materialized-path") {
            entityMetadata.ownColumns.push(new ColumnMetadata_1.ColumnMetadata({
                connection: this.connection,
                entityMetadata: entityMetadata,
                materializedPath: true,
                args: {
                    target: entityMetadata.target,
                    mode: "virtual",
                    propertyName: "mpath",
                    options: /*tree.column || */ {
                        name: namingStrategy.materializedPathColumnName,
                        type: String,
                        nullable: true,
                        default: "",
                    },
                },
            }));
        }
        else if (entityMetadata.treeType === "nested-set") {
            const { left, right } = namingStrategy.nestedSetColumnNames;
            entityMetadata.ownColumns.push(new ColumnMetadata_1.ColumnMetadata({
                connection: this.connection,
                entityMetadata: entityMetadata,
                nestedSetLeft: true,
                args: {
                    target: entityMetadata.target,
                    mode: "virtual",
                    propertyName: left,
                    options: /*tree.column || */ {
                        name: left,
                        type: Number,
                        nullable: false,
                        default: 1,
                    },
                },
            }));
            entityMetadata.ownColumns.push(new ColumnMetadata_1.ColumnMetadata({
                connection: this.connection,
                entityMetadata: entityMetadata,
                nestedSetRight: true,
                args: {
                    target: entityMetadata.target,
                    mode: "virtual",
                    propertyName: right,
                    options: /*tree.column || */ {
                        name: right,
                        type: Number,
                        nullable: false,
                        default: 2,
                    },
                },
            }));
        }
        entityMetadata.ownRelations = this.metadataArgsStorage
            .filterRelations(entityMetadata.inheritanceTree)
            .map((args) => {
            // for single table children we reuse relations created for their parents
            if (entityMetadata.tableType === "entity-child") {
                const parentRelation = entityMetadata.parentEntityMetadata.ownRelations.find((relation) => relation.propertyName === args.propertyName);
                const type = typeof args.type === "function"
                    ? args.type()
                    : args.type;
                if (parentRelation.type !== type) {
                    const clone = Object.create(parentRelation);
                    clone.type = type;
                    return clone;
                }
                return parentRelation;
            }
            return new RelationMetadata_1.RelationMetadata({ entityMetadata, args });
        });
        entityMetadata.relationIds = this.metadataArgsStorage
            .filterRelationIds(entityMetadata.inheritanceTree)
            .map((args) => {
            // for single table children we reuse relation ids created for their parents
            if (entityMetadata.tableType === "entity-child")
                return entityMetadata.parentEntityMetadata.relationIds.find((relationId) => relationId.propertyName === args.propertyName);
            return new RelationIdMetadata_1.RelationIdMetadata({ entityMetadata, args });
        });
        entityMetadata.relationCounts = this.metadataArgsStorage
            .filterRelationCounts(entityMetadata.inheritanceTree)
            .map((args) => {
            // for single table children we reuse relation counts created for their parents
            if (entityMetadata.tableType === "entity-child")
                return entityMetadata.parentEntityMetadata.relationCounts.find((relationCount) => relationCount.propertyName === args.propertyName);
            return new RelationCountMetadata_1.RelationCountMetadata({ entityMetadata, args });
        });
        entityMetadata.ownListeners = this.metadataArgsStorage
            .filterListeners(entityMetadata.inheritanceTree)
            .map((args) => {
            return new EntityListenerMetadata_1.EntityListenerMetadata({
                entityMetadata: entityMetadata,
                args: args,
            });
        });
        entityMetadata.checks = this.metadataArgsStorage
            .filterChecks(entityMetadata.inheritanceTree)
            .map((args) => {
            return new CheckMetadata_1.CheckMetadata({ entityMetadata, args });
        });
        // Only PostgreSQL supports exclusion constraints.
        if (this.connection.driver.options.type === "postgres") {
            entityMetadata.exclusions = this.metadataArgsStorage
                .filterExclusions(entityMetadata.inheritanceTree)
                .map((args) => {
                return new ExclusionMetadata_1.ExclusionMetadata({ entityMetadata, args });
            });
        }
        entityMetadata.ownIndices = this.metadataArgsStorage
            .filterIndices(entityMetadata.inheritanceTree)
            .map((args) => {
            return new IndexMetadata_1.IndexMetadata({ entityMetadata, args });
        });
        // This drivers stores unique constraints as unique indices.
        if (DriverUtils_1.DriverUtils.isMySQLFamily(this.connection.driver)) {
            const indices = this.metadataArgsStorage
                .filterUniques(entityMetadata.inheritanceTree)
                .map((args) => {
                return new IndexMetadata_1.IndexMetadata({
                    entityMetadata: entityMetadata,
                    args: {
                        target: args.target,
                        name: args.name,
                        columns: args.columns,
                        unique: true,
                        synchronize: true,
                    },
                });
            });
            entityMetadata.ownIndices.push(...indices);
        }
        else {
            const uniques = this.metadataArgsStorage
                .filterUniques(entityMetadata.inheritanceTree)
                .map((args) => {
                return new UniqueMetadata_1.UniqueMetadata({ entityMetadata, args });
            });
            entityMetadata.ownUniques.push(...uniques);
        }
    }
    /**
     * Creates from the given embedded metadata args real embedded metadatas with its columns and relations,
     * and does the same for all its sub-embeddeds (goes recursively).
     */
    createEmbeddedsRecursively(entityMetadata, embeddedArgs) {
        return embeddedArgs.map((embeddedArgs) => {
            const embeddedMetadata = new EmbeddedMetadata_1.EmbeddedMetadata({
                entityMetadata: entityMetadata,
                args: embeddedArgs,
            });
            const targets = typeof embeddedMetadata.type === "function"
                ? MetadataUtils_1.MetadataUtils.getInheritanceTree(embeddedMetadata.type)
                : [embeddedMetadata.type]; // todo: implement later here inheritance for string-targets
            embeddedMetadata.columns = this.metadataArgsStorage
                .filterColumns(targets)
                .map((args) => {
                return new ColumnMetadata_1.ColumnMetadata({
                    connection: this.connection,
                    entityMetadata,
                    embeddedMetadata,
                    args,
                });
            });
            embeddedMetadata.relations = this.metadataArgsStorage
                .filterRelations(targets)
                .map((args) => {
                return new RelationMetadata_1.RelationMetadata({
                    entityMetadata,
                    embeddedMetadata,
                    args,
                });
            });
            embeddedMetadata.listeners = this.metadataArgsStorage
                .filterListeners(targets)
                .map((args) => {
                return new EntityListenerMetadata_1.EntityListenerMetadata({
                    entityMetadata,
                    embeddedMetadata,
                    args,
                });
            });
            embeddedMetadata.indices = this.metadataArgsStorage
                .filterIndices(targets)
                .map((args) => {
                return new IndexMetadata_1.IndexMetadata({
                    entityMetadata,
                    embeddedMetadata,
                    args,
                });
            });
            embeddedMetadata.uniques = this.metadataArgsStorage
                .filterUniques(targets)
                .map((args) => {
                return new UniqueMetadata_1.UniqueMetadata({
                    entityMetadata,
                    embeddedMetadata,
                    args,
                });
            });
            embeddedMetadata.relationIds = this.metadataArgsStorage
                .filterRelationIds(targets)
                .map((args) => {
                return new RelationIdMetadata_1.RelationIdMetadata({ entityMetadata, args });
            });
            embeddedMetadata.relationCounts = this.metadataArgsStorage
                .filterRelationCounts(targets)
                .map((args) => {
                return new RelationCountMetadata_1.RelationCountMetadata({ entityMetadata, args });
            });
            embeddedMetadata.embeddeds = this.createEmbeddedsRecursively(entityMetadata, this.metadataArgsStorage.filterEmbeddeds(targets));
            embeddedMetadata.embeddeds.forEach((subEmbedded) => (subEmbedded.parentEmbeddedMetadata = embeddedMetadata));
            entityMetadata.allEmbeddeds.push(embeddedMetadata);
            return embeddedMetadata;
        });
    }
    /**
     * Computes all entity metadata's computed properties, and all its sub-metadatas (relations, columns, embeds, etc).
     */
    computeEntityMetadataStep2(entityMetadata) {
        entityMetadata.embeddeds.forEach((embedded) => embedded.build(this.connection));
        entityMetadata.embeddeds.forEach((embedded) => {
            embedded.columnsFromTree.forEach((column) => column.build(this.connection));
            embedded.relationsFromTree.forEach((relation) => relation.build());
        });
        entityMetadata.ownColumns.forEach((column) => column.build(this.connection));
        entityMetadata.ownRelations.forEach((relation) => relation.build());
        entityMetadata.relations = entityMetadata.embeddeds.reduce((relations, embedded) => relations.concat(embedded.relationsFromTree), entityMetadata.ownRelations);
        entityMetadata.eagerRelations = entityMetadata.relations.filter((relation) => relation.isEager);
        entityMetadata.lazyRelations = entityMetadata.relations.filter((relation) => relation.isLazy);
        entityMetadata.oneToOneRelations = entityMetadata.relations.filter((relation) => relation.isOneToOne);
        entityMetadata.oneToManyRelations = entityMetadata.relations.filter((relation) => relation.isOneToMany);
        entityMetadata.manyToOneRelations = entityMetadata.relations.filter((relation) => relation.isManyToOne);
        entityMetadata.manyToManyRelations = entityMetadata.relations.filter((relation) => relation.isManyToMany);
        entityMetadata.ownerOneToOneRelations = entityMetadata.relations.filter((relation) => relation.isOneToOneOwner);
        entityMetadata.ownerManyToManyRelations =
            entityMetadata.relations.filter((relation) => relation.isManyToManyOwner);
        entityMetadata.treeParentRelation = entityMetadata.relations.find((relation) => relation.isTreeParent);
        entityMetadata.treeChildrenRelation = entityMetadata.relations.find((relation) => relation.isTreeChildren);
        entityMetadata.columns = entityMetadata.embeddeds.reduce((columns, embedded) => columns.concat(embedded.columnsFromTree), entityMetadata.ownColumns);
        entityMetadata.listeners = entityMetadata.embeddeds.reduce((listeners, embedded) => listeners.concat(embedded.listenersFromTree), entityMetadata.ownListeners);
        entityMetadata.afterLoadListeners = entityMetadata.listeners.filter((listener) => listener.type === EventListenerTypes_1.EventListenerTypes.AFTER_LOAD);
        entityMetadata.afterInsertListeners = entityMetadata.listeners.filter((listener) => listener.type === EventListenerTypes_1.EventListenerTypes.AFTER_INSERT);
        entityMetadata.afterUpdateListeners = entityMetadata.listeners.filter((listener) => listener.type === EventListenerTypes_1.EventListenerTypes.AFTER_UPDATE);
        entityMetadata.afterRemoveListeners = entityMetadata.listeners.filter((listener) => listener.type === EventListenerTypes_1.EventListenerTypes.AFTER_REMOVE);
        entityMetadata.afterSoftRemoveListeners =
            entityMetadata.listeners.filter((listener) => listener.type === EventListenerTypes_1.EventListenerTypes.AFTER_SOFT_REMOVE);
        entityMetadata.afterRecoverListeners = entityMetadata.listeners.filter((listener) => listener.type === EventListenerTypes_1.EventListenerTypes.AFTER_RECOVER);
        entityMetadata.beforeInsertListeners = entityMetadata.listeners.filter((listener) => listener.type === EventListenerTypes_1.EventListenerTypes.BEFORE_INSERT);
        entityMetadata.beforeUpdateListeners = entityMetadata.listeners.filter((listener) => listener.type === EventListenerTypes_1.EventListenerTypes.BEFORE_UPDATE);
        entityMetadata.beforeRemoveListeners = entityMetadata.listeners.filter((listener) => listener.type === EventListenerTypes_1.EventListenerTypes.BEFORE_REMOVE);
        entityMetadata.beforeSoftRemoveListeners =
            entityMetadata.listeners.filter((listener) => listener.type === EventListenerTypes_1.EventListenerTypes.BEFORE_SOFT_REMOVE);
        entityMetadata.beforeRecoverListeners = entityMetadata.listeners.filter((listener) => listener.type === EventListenerTypes_1.EventListenerTypes.BEFORE_RECOVER);
        entityMetadata.indices = entityMetadata.embeddeds.reduce((indices, embedded) => indices.concat(embedded.indicesFromTree), entityMetadata.ownIndices);
        entityMetadata.uniques = entityMetadata.embeddeds.reduce((uniques, embedded) => uniques.concat(embedded.uniquesFromTree), entityMetadata.ownUniques);
        entityMetadata.primaryColumns = entityMetadata.columns.filter((column) => column.isPrimary);
        entityMetadata.nonVirtualColumns = entityMetadata.columns.filter((column) => !column.isVirtual);
        entityMetadata.ancestorColumns = entityMetadata.columns.filter((column) => column.closureType === "ancestor");
        entityMetadata.descendantColumns = entityMetadata.columns.filter((column) => column.closureType === "descendant");
        entityMetadata.hasMultiplePrimaryKeys =
            entityMetadata.primaryColumns.length > 1;
        entityMetadata.generatedColumns = entityMetadata.columns.filter((column) => column.isGenerated || column.isObjectId);
        entityMetadata.hasUUIDGeneratedColumns =
            entityMetadata.columns.filter((column) => column.isGenerated || column.generationStrategy === "uuid").length > 0;
        entityMetadata.createDateColumn = entityMetadata.columns.find((column) => column.isCreateDate);
        entityMetadata.updateDateColumn = entityMetadata.columns.find((column) => column.isUpdateDate);
        entityMetadata.deleteDateColumn = entityMetadata.columns.find((column) => column.isDeleteDate);
        entityMetadata.versionColumn = entityMetadata.columns.find((column) => column.isVersion);
        entityMetadata.discriminatorColumn = entityMetadata.columns.find((column) => column.isDiscriminator);
        entityMetadata.treeLevelColumn = entityMetadata.columns.find((column) => column.isTreeLevel);
        entityMetadata.nestedSetLeftColumn = entityMetadata.columns.find((column) => column.isNestedSetLeft);
        entityMetadata.nestedSetRightColumn = entityMetadata.columns.find((column) => column.isNestedSetRight);
        entityMetadata.materializedPathColumn = entityMetadata.columns.find((column) => column.isMaterializedPath);
        entityMetadata.objectIdColumn = entityMetadata.columns.find((column) => column.isObjectId);
        entityMetadata.foreignKeys.forEach((foreignKey) => foreignKey.build(this.connection.namingStrategy));
        entityMetadata.propertiesMap = entityMetadata.createPropertiesMap();
        entityMetadata.relationIds.forEach((relationId) => relationId.build());
        entityMetadata.relationCounts.forEach((relationCount) => relationCount.build());
        entityMetadata.embeddeds.forEach((embedded) => {
            embedded.relationIdsFromTree.forEach((relationId) => relationId.build());
            embedded.relationCountsFromTree.forEach((relationCount) => relationCount.build());
        });
    }
    /**
     * Computes entity metadata's relations inverse side properties.
     */
    computeInverseProperties(entityMetadata, entityMetadatas) {
        entityMetadata.relations.forEach((relation) => {
            // compute inverse side (related) entity metadatas for all relation metadatas
            const inverseEntityMetadata = entityMetadatas.find((m) => m.target === relation.type ||
                (typeof relation.type === "string" &&
                    (m.targetName === relation.type ||
                        m.givenTableName === relation.type)));
            if (!inverseEntityMetadata)
                throw new error_1.TypeORMError("Entity metadata for " +
                    entityMetadata.name +
                    "#" +
                    relation.propertyPath +
                    " was not found. Check if you specified a correct entity object and if it's connected in the connection options.");
            relation.inverseEntityMetadata = inverseEntityMetadata;
            relation.inverseSidePropertyPath =
                relation.buildInverseSidePropertyPath();
            // and compute inverse relation and mark if it has such
            relation.inverseRelation = inverseEntityMetadata.relations.find((foundRelation) => foundRelation.propertyPath ===
                relation.inverseSidePropertyPath);
        });
    }
    /**
     * Creates indices for the table of single table inheritance.
     */
    createKeysForTableInheritance(entityMetadata) {
        const isDiscriminatorColumnAlreadyIndexed = entityMetadata.indices.some(({ givenColumnNames }) => !!givenColumnNames &&
            Array.isArray(givenColumnNames) &&
            givenColumnNames.length === 1 &&
            givenColumnNames[0] ===
                entityMetadata.discriminatorColumn?.databaseName);
        // If the discriminator column is already indexed, there is no need to
        // add another index on top of it.
        if (isDiscriminatorColumnAlreadyIndexed) {
            return;
        }
        entityMetadata.indices.push(new IndexMetadata_1.IndexMetadata({
            entityMetadata: entityMetadata,
            columns: [entityMetadata.discriminatorColumn],
            args: {
                target: entityMetadata.target,
                unique: false,
            },
        }));
    }
}
exports.EntityMetadataBuilder = EntityMetadataBuilder;

//# sourceMappingURL=EntityMetadataBuilder.js.map
