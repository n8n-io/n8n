"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationMetadata = void 0;
const EntityMetadata_1 = require("./EntityMetadata");
const error_1 = require("../error");
const ObjectUtils_1 = require("../util/ObjectUtils");
const InstanceChecker_1 = require("../util/InstanceChecker");
/**
 * Contains all information about some entity's relation.
 */
class RelationMetadata {
    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------
    constructor(options) {
        /**
         * Indicates if this is a parent (can be only many-to-one relation) relation in the tree tables.
         */
        this.isTreeParent = false;
        /**
         * Indicates if this is a children (can be only one-to-many relation) relation in the tree tables.
         */
        this.isTreeChildren = false;
        /**
         * Indicates if this relation's column is a primary key.
         * Can be used only for many-to-one and owner one-to-one relations.
         */
        this.isPrimary = false;
        /**
         * Indicates if this relation is lazily loaded.
         */
        this.isLazy = false;
        /**
         * Indicates if this relation is eagerly loaded.
         */
        this.isEager = false;
        /**
         * Indicates if persistence is enabled for the relation.
         * By default its enabled, but if you want to avoid any changes in the relation to be reflected in the database you can disable it.
         * If its disabled you can only change a relation from inverse side of a relation or using relation query builder functionality.
         * This is useful for performance optimization since its disabling avoid multiple extra queries during entity save.
         */
        this.persistenceEnabled = true;
        /**
         * If set to true then related objects are allowed to be inserted to the database.
         */
        this.isCascadeInsert = false;
        /**
         * If set to true then related objects are allowed to be updated in the database.
         */
        this.isCascadeUpdate = false;
        /**
         * If set to true then related objects are allowed to be remove from the database.
         */
        this.isCascadeRemove = false;
        /**
         * If set to true then related objects are allowed to be soft-removed from the database.
         */
        this.isCascadeSoftRemove = false;
        /**
         * If set to true then related objects are allowed to be recovered from the database.
         */
        this.isCascadeRecover = false;
        /**
         * Indicates if relation column value can be nullable or not.
         */
        this.isNullable = true;
        /**
         * Indicates whether foreign key constraints will be created for join columns.
         * Can be used only for many-to-one and owner one-to-one relations.
         * Defaults to true.
         */
        this.createForeignKeyConstraints = true;
        /**
         * Indicates if this side is an owner of this relation.
         */
        this.isOwning = false;
        /**
         * Checks if this relation's type is "one-to-one".
         */
        this.isOneToOne = false;
        /**
         * Checks if this relation is owner side of the "one-to-one" relation.
         * Owner side means this side of relation has a join column in the table.
         */
        this.isOneToOneOwner = false;
        /**
         * Checks if this relation has a join column (e.g. is it many-to-one or one-to-one owner side).
         */
        this.isWithJoinColumn = false;
        /**
         * Checks if this relation is NOT owner side of the "one-to-one" relation.
         * NOT owner side means this side of relation does not have a join column in the table.
         */
        this.isOneToOneNotOwner = false;
        /**
         * Checks if this relation's type is "one-to-many".
         */
        this.isOneToMany = false;
        /**
         * Checks if this relation's type is "many-to-one".
         */
        this.isManyToOne = false;
        /**
         * Checks if this relation's type is "many-to-many".
         */
        this.isManyToMany = false;
        /**
         * Checks if this relation's type is "many-to-many", and is owner side of the relationship.
         * Owner side means this side of relation has a join table.
         */
        this.isManyToManyOwner = false;
        /**
         * Checks if this relation's type is "many-to-many", and is NOT owner side of the relationship.
         * Not owner side means this side of relation does not have a join table.
         */
        this.isManyToManyNotOwner = false;
        /**
         * Foreign keys created for this relation.
         */
        this.foreignKeys = [];
        /**
         * Join table columns.
         * Join columns can be obtained only from owner side of the relation.
         * From non-owner side of the relation join columns will be empty.
         * If this relation is a many-to-one/one-to-one then it takes join columns from the current entity.
         * If this relation is many-to-many then it takes all owner join columns from the junction entity.
         */
        this.joinColumns = [];
        /**
         * Inverse join table columns.
         * Inverse join columns are supported only for many-to-many relations
         * and can be obtained only from owner side of the relation.
         * From non-owner side of the relation join columns will be undefined.
         */
        this.inverseJoinColumns = [];
        this.entityMetadata = options.entityMetadata;
        this.embeddedMetadata = options.embeddedMetadata;
        const args = options.args;
        this.target = args.target;
        this.propertyName = args.propertyName;
        this.relationType = args.relationType;
        if (args.inverseSideProperty)
            this.givenInverseSidePropertyFactory = args.inverseSideProperty;
        this.isLazy = args.isLazy || false;
        // this.isCascadeInsert = args.options.cascade === true || (args.options.cascade instanceof Array && args.options.cascade.indexOf("insert") !== -1);
        // this.isCascadeUpdate = args.options.cascade === true || (args.options.cascade instanceof Array && args.options.cascade.indexOf("update") !== -1);
        // this.isCascadeRemove = args.options.cascade === true || (args.options.cascade instanceof Array && args.options.cascade.indexOf("remove") !== -1);
        // this.isCascadeSoftRemove = args.options.cascade === true || (args.options.cascade instanceof Array && args.options.cascade.indexOf("soft-remove") !== -1);
        // this.isCascadeRecover = args.options.cascade === true || (args.options.cascade instanceof Array && args.options.cascade.indexOf("recover") !== -1);
        this.isCascadeInsert =
            args.options.cascade === true ||
                (Array.isArray(args.options.cascade) &&
                    args.options.cascade.indexOf("insert") !== -1);
        this.isCascadeUpdate =
            args.options.cascade === true ||
                (Array.isArray(args.options.cascade) &&
                    args.options.cascade.indexOf("update") !== -1);
        this.isCascadeRemove =
            args.options.cascade === true ||
                (Array.isArray(args.options.cascade) &&
                    args.options.cascade.indexOf("remove") !== -1);
        this.isCascadeSoftRemove =
            args.options.cascade === true ||
                (Array.isArray(args.options.cascade) &&
                    args.options.cascade.indexOf("soft-remove") !== -1);
        this.isCascadeRecover =
            args.options.cascade === true ||
                (Array.isArray(args.options.cascade) &&
                    args.options.cascade.indexOf("recover") !== -1);
        // this.isPrimary = args.options.primary || false;
        this.isNullable =
            args.options.nullable === false || this.isPrimary ? false : true;
        this.onDelete = args.options.onDelete;
        this.onUpdate = args.options.onUpdate;
        this.deferrable = args.options.deferrable;
        this.createForeignKeyConstraints =
            args.options.createForeignKeyConstraints === false ? false : true;
        this.isEager = args.options.eager || false;
        this.persistenceEnabled =
            args.options.persistence === false ? false : true;
        this.orphanedRowAction = args.options.orphanedRowAction || "nullify";
        this.isTreeParent = args.isTreeParent || false;
        this.isTreeChildren = args.isTreeChildren || false;
        if (typeof args.type === "function") {
            this.type =
                typeof args.type === "function"
                    ? args.type()
                    : args.type;
        }
        else if (InstanceChecker_1.InstanceChecker.isEntitySchema(args.type)) {
            this.type = args.type.options.name;
        }
        else if (ObjectUtils_1.ObjectUtils.isObject(args.type) &&
            typeof args.type.name === "string") {
            this.type = args.type.name;
        }
        else {
            this.type = args.type;
        }
        this.isOneToOne = this.relationType === "one-to-one";
        this.isOneToMany = this.relationType === "one-to-many";
        this.isManyToOne = this.relationType === "many-to-one";
        this.isManyToMany = this.relationType === "many-to-many";
        this.isOneToOneNotOwner = this.isOneToOne ? true : false;
        this.isManyToManyNotOwner = this.isManyToMany ? true : false;
    }
    // ---------------------------------------------------------------------
    // Public Methods
    // ---------------------------------------------------------------------
    /**
     * Creates join column ids map from the given related entity ids array.
     */
    getRelationIdMap(entity) {
        const joinColumns = this.isOwning
            ? this.joinColumns
            : this.inverseRelation.joinColumns;
        const referencedColumns = joinColumns.map((joinColumn) => joinColumn.referencedColumn);
        // console.log("entity", entity);
        // console.log("referencedColumns", referencedColumns);
        return EntityMetadata_1.EntityMetadata.getValueMap(entity, referencedColumns);
    }
    /**
     * Ensures that given object is an entity id map.
     * If given id is an object then it means its already id map.
     * If given id isn't an object then it means its a value of the id column
     * and it creates a new id map with this value and name of the primary column.
     */
    ensureRelationIdMap(id) {
        if (ObjectUtils_1.ObjectUtils.isObject(id))
            return id;
        const joinColumns = this.isOwning
            ? this.joinColumns
            : this.inverseRelation.joinColumns;
        const referencedColumns = joinColumns.map((joinColumn) => joinColumn.referencedColumn);
        if (referencedColumns.length > 1)
            throw new error_1.TypeORMError(`Cannot create relation id map for a single value because relation contains multiple referenced columns.`);
        return referencedColumns[0].createValueMap(id);
    }
    /**
     * Extracts column value from the given entity.
     * If column is in embedded (or recursive embedded) it extracts its value from there.
     */
    getEntityValue(entity, getLazyRelationsPromiseValue = false) {
        if (entity === null || entity === undefined)
            return undefined;
        // extract column value from embeddeds of entity if column is in embedded
        if (this.embeddedMetadata) {
            // example: post[data][information][counters].id where "data", "information" and "counters" are embeddeds
            // we need to get value of "id" column from the post real entity object
            // first step - we extract all parent properties of the entity relative to this column, e.g. [data, information, counters]
            const propertyNames = [...this.embeddedMetadata.parentPropertyNames];
            // next we need to access post[data][information][counters][this.propertyName] to get column value from the counters
            // this recursive function takes array of generated property names and gets the post[data][information][counters] embed
            const extractEmbeddedColumnValue = (propertyNames, value) => {
                const propertyName = propertyNames.shift();
                if (propertyName) {
                    if (value[propertyName]) {
                        return extractEmbeddedColumnValue(propertyNames, value[propertyName]);
                    }
                    return undefined;
                }
                return value;
            };
            // once we get nested embed object we get its column, e.g. post[data][information][counters][this.propertyName]
            const embeddedObject = extractEmbeddedColumnValue(propertyNames, entity);
            if (this.isLazy) {
                if (embeddedObject["__" + this.propertyName + "__"] !==
                    undefined)
                    return embeddedObject["__" + this.propertyName + "__"];
                if (getLazyRelationsPromiseValue === true)
                    return embeddedObject[this.propertyName];
                return undefined;
            }
            return embeddedObject
                ? embeddedObject[this.isLazy
                    ? "__" + this.propertyName + "__"
                    : this.propertyName]
                : undefined;
        }
        else {
            // no embeds - no problems. Simply return column name by property name of the entity
            if (this.isLazy) {
                if (entity["__" + this.propertyName + "__"] !== undefined)
                    return entity["__" + this.propertyName + "__"];
                if (getLazyRelationsPromiseValue === true)
                    return entity[this.propertyName];
                return undefined;
            }
            return entity[this.propertyName];
        }
    }
    /**
     * Sets given entity's relation's value.
     * Using of this method helps to set entity relation's value of the lazy and non-lazy relations.
     *
     * If merge is set to true, it merges given value into currently
     */
    setEntityValue(entity, value) {
        const propertyName = this.isLazy
            ? "__" + this.propertyName + "__"
            : this.propertyName;
        if (this.embeddedMetadata) {
            // first step - we extract all parent properties of the entity relative to this column, e.g. [data, information, counters]
            const extractEmbeddedColumnValue = (embeddedMetadatas, map) => {
                // if (!object[embeddedMetadata.propertyName])
                //     object[embeddedMetadata.propertyName] = embeddedMetadata.create();
                const embeddedMetadata = embeddedMetadatas.shift();
                if (embeddedMetadata) {
                    if (!map[embeddedMetadata.propertyName])
                        map[embeddedMetadata.propertyName] =
                            embeddedMetadata.create();
                    extractEmbeddedColumnValue(embeddedMetadatas, map[embeddedMetadata.propertyName]);
                    return map;
                }
                map[propertyName] = value;
                return map;
            };
            return extractEmbeddedColumnValue([...this.embeddedMetadata.embeddedMetadataTree], entity);
        }
        else {
            entity[propertyName] = value;
        }
    }
    /**
     * Creates entity id map from the given entity ids array.
     */
    createValueMap(value) {
        // extract column value from embeds of entity if column is in embedded
        if (this.embeddedMetadata) {
            // example: post[data][information][counters].id where "data", "information" and "counters" are embeddeds
            // we need to get value of "id" column from the post real entity object and return it in a
            // { data: { information: { counters: { id: ... } } } } format
            // first step - we extract all parent properties of the entity relative to this column, e.g. [data, information, counters]
            const propertyNames = [...this.embeddedMetadata.parentPropertyNames];
            // now need to access post[data][information][counters] to get column value from the counters
            // and on each step we need to create complex literal object, e.g. first { data },
            // then { data: { information } }, then { data: { information: { counters } } },
            // then { data: { information: { counters: [this.propertyName]: entity[data][information][counters][this.propertyName] } } }
            // this recursive function helps doing that
            const extractEmbeddedColumnValue = (propertyNames, map) => {
                const propertyName = propertyNames.shift();
                if (propertyName) {
                    map[propertyName] = {};
                    extractEmbeddedColumnValue(propertyNames, map[propertyName]);
                    return map;
                }
                map[this.propertyName] = value;
                return map;
            };
            return extractEmbeddedColumnValue(propertyNames, {});
        }
        else {
            // no embeds - no problems. Simply return column property name and its value of the entity
            return { [this.propertyName]: value };
        }
    }
    // ---------------------------------------------------------------------
    // Builder Methods
    // ---------------------------------------------------------------------
    /**
     * Builds some depend relation metadata properties.
     * This builder method should be used only after embedded metadata tree was build.
     */
    build() {
        this.propertyPath = this.buildPropertyPath();
    }
    /**
     * Registers given foreign keys in the relation.
     * This builder method should be used to register foreign key in the relation.
     */
    registerForeignKeys(...foreignKeys) {
        this.foreignKeys.push(...foreignKeys);
    }
    /**
     * Registers given join columns in the relation.
     * This builder method should be used to register join column in the relation.
     */
    registerJoinColumns(joinColumns = [], inverseJoinColumns = []) {
        this.joinColumns = joinColumns;
        this.inverseJoinColumns = inverseJoinColumns;
        this.isOwning =
            this.isManyToOne ||
                ((this.isManyToMany || this.isOneToOne) &&
                    this.joinColumns.length > 0);
        this.isOneToOneOwner = this.isOneToOne && this.isOwning;
        this.isOneToOneNotOwner = this.isOneToOne && !this.isOwning;
        this.isManyToManyOwner = this.isManyToMany && this.isOwning;
        this.isManyToManyNotOwner = this.isManyToMany && !this.isOwning;
        this.isWithJoinColumn = this.isManyToOne || this.isOneToOneOwner;
    }
    /**
     * Registers a given junction entity metadata.
     * This builder method can be called after junction entity metadata for the many-to-many relation was created.
     */
    registerJunctionEntityMetadata(junctionEntityMetadata) {
        this.junctionEntityMetadata = junctionEntityMetadata;
        this.joinTableName = junctionEntityMetadata.tableName;
        if (this.inverseRelation) {
            this.inverseRelation.junctionEntityMetadata = junctionEntityMetadata;
            this.joinTableName = junctionEntityMetadata.tableName;
        }
    }
    /**
     * Builds inverse side property path based on given inverse side property factory.
     * This builder method should be used only after properties map of the inverse entity metadata was build.
     */
    buildInverseSidePropertyPath() {
        if (this.givenInverseSidePropertyFactory) {
            const ownerEntityPropertiesMap = this.inverseEntityMetadata.propertiesMap;
            if (typeof this.givenInverseSidePropertyFactory === "function")
                return this.givenInverseSidePropertyFactory(ownerEntityPropertiesMap);
            if (typeof this.givenInverseSidePropertyFactory === "string")
                return this.givenInverseSidePropertyFactory;
        }
        else if (this.isTreeParent &&
            this.entityMetadata.treeChildrenRelation) {
            return this.entityMetadata.treeChildrenRelation.propertyName;
        }
        else if (this.isTreeChildren &&
            this.entityMetadata.treeParentRelation) {
            return this.entityMetadata.treeParentRelation.propertyName;
        }
        return "";
    }
    /**
     * Builds relation's property path based on its embedded tree.
     */
    buildPropertyPath() {
        if (!this.embeddedMetadata ||
            !this.embeddedMetadata.parentPropertyNames.length)
            return this.propertyName;
        return (this.embeddedMetadata.parentPropertyNames.join(".") +
            "." +
            this.propertyName);
    }
}
exports.RelationMetadata = RelationMetadata;

//# sourceMappingURL=RelationMetadata.js.map
