import { QueryRunner, SelectQueryBuilder } from "..";
import { ObjectLiteral } from "../common/ObjectLiteral";
import { DataSource } from "../data-source/DataSource";
import { OrderByCondition } from "../find-options/OrderByCondition";
import { TableMetadataArgs } from "../metadata-args/TableMetadataArgs";
import { TreeMetadataArgs } from "../metadata-args/TreeMetadataArgs";
import { CheckMetadata } from "./CheckMetadata";
import { ColumnMetadata } from "./ColumnMetadata";
import { EmbeddedMetadata } from "./EmbeddedMetadata";
import { EntityListenerMetadata } from "./EntityListenerMetadata";
import { ExclusionMetadata } from "./ExclusionMetadata";
import { ForeignKeyMetadata } from "./ForeignKeyMetadata";
import { IndexMetadata } from "./IndexMetadata";
import { RelationCountMetadata } from "./RelationCountMetadata";
import { RelationIdMetadata } from "./RelationIdMetadata";
import { RelationMetadata } from "./RelationMetadata";
import { TableType } from "./types/TableTypes";
import { TreeType } from "./types/TreeTypes";
import { UniqueMetadata } from "./UniqueMetadata";
import { ClosureTreeOptions } from "./types/ClosureTreeOptions";
/**
 * Contains all entity metadata.
 */
export declare class EntityMetadata {
    readonly "@instanceof": symbol;
    /**
     * Connection where this entity metadata is created.
     */
    connection: DataSource;
    /**
     * Metadata arguments used to build this entity metadata.
     */
    tableMetadataArgs: TableMetadataArgs;
    /**
     * If entity's table is a closure-typed table, then this entity will have a closure junction table metadata.
     */
    closureJunctionTable: EntityMetadata;
    /**
     * If this is entity metadata for a junction closure table then its owner closure table metadata will be set here.
     */
    parentClosureEntityMetadata: EntityMetadata;
    /**
     * Parent's entity metadata. Used in inheritance patterns.
     */
    parentEntityMetadata: EntityMetadata;
    /**
     * Children entity metadatas. Used in inheritance patterns.
     */
    childEntityMetadatas: EntityMetadata[];
    /**
     * All "inheritance tree" from a target entity.
     * For example for target Post < ContentModel < Unit it will be an array of [Post, ContentModel, Unit].
     * It also contains child entities for single table inheritance.
     */
    inheritanceTree: Function[];
    /**
     * Table type. Tables can be closure, junction, etc.
     */
    tableType: TableType;
    /**
     * Target class to which this entity metadata is bind.
     * Note, that when using table inheritance patterns target can be different rather then table's target.
     * For virtual tables which lack of real entity (like junction tables) target is equal to their table name.
     */
    target: Function | string;
    /**
     * Gets the name of the target.
     */
    targetName: string;
    /**
     * Entity's name.
     * Equal to entity target class's name if target is set to table.
     * If target class is not then then it equals to table name.
     */
    name: string;
    /**
     * View's expression.
     * Used in views
     */
    expression?: string | ((connection: DataSource) => SelectQueryBuilder<any>);
    /**
     * View's dependencies.
     * Used in views
     */
    dependsOn?: Set<Function | string>;
    /**
     * Enables Sqlite "WITHOUT ROWID" modifier for the "CREATE TABLE" statement
     */
    withoutRowid?: boolean;
    /**
     * Original user-given table name (taken from schema or @Entity(tableName) decorator).
     * If user haven't specified a table name this property will be undefined.
     */
    givenTableName?: string;
    /**
     * Entity table name in the database.
     * This is final table name of the entity.
     * This name already passed naming strategy, and generated based on
     * multiple criteria, including user table name and global table prefix.
     */
    tableName: string;
    /**
     * Entity table path. Contains database name, schema name and table name.
     * E.g. myDB.mySchema.myTable
     */
    tablePath: string;
    /**
     * Gets the table name without global table prefix.
     * When querying table you need a table name with prefix, but in some scenarios,
     * for example when you want to name a junction table that contains names of two other tables,
     * you may want a table name without prefix.
     */
    tableNameWithoutPrefix: string;
    /**
     * Indicates if schema will be synchronized for this entity or not.
     */
    synchronize: boolean;
    /**
     * Table's database engine type (like "InnoDB", "MyISAM", etc).
     */
    engine?: string;
    /**
     * Database name.
     */
    database?: string;
    /**
     * Schema name. Used in Postgres and Sql Server.
     */
    schema?: string;
    /**
     * Specifies a default order by used for queries from this table when no explicit order by is specified.
     */
    orderBy?: OrderByCondition;
    /**
     * If this entity metadata's table using one of the inheritance patterns,
     * then this will contain what pattern it uses.
     */
    inheritancePattern?: "STI";
    /**
     * Checks if there any non-nullable column exist in this entity.
     */
    hasNonNullableRelations: boolean;
    /**
     * Indicates if this entity metadata of a junction table, or not.
     * Junction table is a table created by many-to-many relationship.
     *
     * Its also possible to understand if entity is junction via tableType.
     */
    isJunction: boolean;
    /**
     * Indicates if the entity should be instantiated using the constructor
     * or via allocating a new object via `Object.create()`.
     */
    isAlwaysUsingConstructor: boolean;
    /**
     * Indicates if this entity is a tree, what type of tree it is.
     */
    treeType?: TreeType;
    /**
     * Indicates if this entity is a tree, what options of tree it has.
     */
    treeOptions?: ClosureTreeOptions;
    /**
     * Checks if this table is a junction table of the closure table.
     * This type is for tables that contain junction metadata of the closure tables.
     */
    isClosureJunction: boolean;
    /**
     * Checks if entity's table has multiple primary columns.
     */
    hasMultiplePrimaryKeys: boolean;
    /**
     * Indicates if this entity metadata has uuid generated columns.
     */
    hasUUIDGeneratedColumns: boolean;
    /**
     * If this entity metadata is a child table of some table, it should have a discriminator value.
     * Used to store a value in a discriminator column.
     */
    discriminatorValue?: string;
    /**
     * Entity's column metadatas defined by user.
     */
    ownColumns: ColumnMetadata[];
    /**
     * Columns of the entity, including columns that are coming from the embeddeds of this entity.
     */
    columns: ColumnMetadata[];
    /**
     * Ancestor columns used only in closure junction tables.
     */
    ancestorColumns: ColumnMetadata[];
    /**
     * Descendant columns used only in closure junction tables.
     */
    descendantColumns: ColumnMetadata[];
    /**
     * All columns except for virtual columns.
     */
    nonVirtualColumns: ColumnMetadata[];
    /**
     * In the case if this entity metadata is junction table's entity metadata,
     * this will contain all referenced columns of owner entity.
     */
    ownerColumns: ColumnMetadata[];
    /**
     * In the case if this entity metadata is junction table's entity metadata,
     * this will contain all referenced columns of inverse entity.
     */
    inverseColumns: ColumnMetadata[];
    /**
     * Gets the column with generated flag.
     */
    generatedColumns: ColumnMetadata[];
    /**
     * Gets the object id column used with mongodb database.
     */
    objectIdColumn?: ColumnMetadata;
    /**
     * Gets entity column which contains a create date value.
     */
    createDateColumn?: ColumnMetadata;
    /**
     * Gets entity column which contains an update date value.
     */
    updateDateColumn?: ColumnMetadata;
    /**
     * Gets entity column which contains a delete date value.
     */
    deleteDateColumn?: ColumnMetadata;
    /**
     * Gets entity column which contains an entity version.
     */
    versionColumn?: ColumnMetadata;
    /**
     * Gets the discriminator column used to store entity identificator in single-table inheritance tables.
     */
    discriminatorColumn?: ColumnMetadata;
    /**
     * Special column that stores tree level in tree entities.
     */
    treeLevelColumn?: ColumnMetadata;
    /**
     * Nested set's left value column.
     * Used only in tree entities with nested set pattern applied.
     */
    nestedSetLeftColumn?: ColumnMetadata;
    /**
     * Nested set's right value column.
     * Used only in tree entities with nested set pattern applied.
     */
    nestedSetRightColumn?: ColumnMetadata;
    /**
     * Materialized path column.
     * Used only in tree entities with materialized path pattern applied.
     */
    materializedPathColumn?: ColumnMetadata;
    /**
     * Gets the primary columns.
     */
    primaryColumns: ColumnMetadata[];
    /**
     * Entity's relation metadatas.
     */
    ownRelations: RelationMetadata[];
    /**
     * Relations of the entity, including relations that are coming from the embeddeds of this entity.
     */
    relations: RelationMetadata[];
    /**
     * List of eager relations this metadata has.
     */
    eagerRelations: RelationMetadata[];
    /**
     * List of eager relations this metadata has.
     */
    lazyRelations: RelationMetadata[];
    /**
     * Gets only one-to-one relations of the entity.
     */
    oneToOneRelations: RelationMetadata[];
    /**
     * Gets only owner one-to-one relations of the entity.
     */
    ownerOneToOneRelations: RelationMetadata[];
    /**
     * Gets only one-to-many relations of the entity.
     */
    oneToManyRelations: RelationMetadata[];
    /**
     * Gets only many-to-one relations of the entity.
     */
    manyToOneRelations: RelationMetadata[];
    /**
     * Gets only many-to-many relations of the entity.
     */
    manyToManyRelations: RelationMetadata[];
    /**
     * Gets only owner many-to-many relations of the entity.
     */
    ownerManyToManyRelations: RelationMetadata[];
    /**
     * Gets only owner one-to-one and many-to-one relations.
     */
    relationsWithJoinColumns: RelationMetadata[];
    /**
     * Tree parent relation. Used only in tree-tables.
     */
    treeParentRelation?: RelationMetadata;
    /**
     * Tree children relation. Used only in tree-tables.
     */
    treeChildrenRelation?: RelationMetadata;
    /**
     * Entity's relation id metadatas.
     */
    relationIds: RelationIdMetadata[];
    /**
     * Entity's relation id metadatas.
     */
    relationCounts: RelationCountMetadata[];
    /**
     * Entity's foreign key metadatas.
     */
    foreignKeys: ForeignKeyMetadata[];
    /**
     * Entity's embedded metadatas.
     */
    embeddeds: EmbeddedMetadata[];
    /**
     * All embeddeds - embeddeds from this entity metadata and from all child embeddeds, etc.
     */
    allEmbeddeds: EmbeddedMetadata[];
    /**
     * Entity's own indices.
     */
    ownIndices: IndexMetadata[];
    /**
     * Entity's index metadatas.
     */
    indices: IndexMetadata[];
    /**
     * Entity's unique metadatas.
     */
    uniques: UniqueMetadata[];
    /**
     * Entity's own uniques.
     */
    ownUniques: UniqueMetadata[];
    /**
     * Entity's check metadatas.
     */
    checks: CheckMetadata[];
    /**
     * Entity's exclusion metadatas.
     */
    exclusions: ExclusionMetadata[];
    /**
     * Entity's own listener metadatas.
     */
    ownListeners: EntityListenerMetadata[];
    /**
     * Entity listener metadatas.
     */
    listeners: EntityListenerMetadata[];
    /**
     * Listener metadatas with "AFTER LOAD" type.
     */
    afterLoadListeners: EntityListenerMetadata[];
    /**
     * Listener metadatas with "BEFORE INSERT" type.
     */
    beforeInsertListeners: EntityListenerMetadata[];
    /**
     * Listener metadatas with "AFTER INSERT" type.
     */
    afterInsertListeners: EntityListenerMetadata[];
    /**
     * Listener metadatas with "BEFORE UPDATE" type.
     */
    beforeUpdateListeners: EntityListenerMetadata[];
    /**
     * Listener metadatas with "AFTER UPDATE" type.
     */
    afterUpdateListeners: EntityListenerMetadata[];
    /**
     * Listener metadatas with "BEFORE REMOVE" type.
     */
    beforeRemoveListeners: EntityListenerMetadata[];
    /**
     * Listener metadatas with "BEFORE SOFT REMOVE" type.
     */
    beforeSoftRemoveListeners: EntityListenerMetadata[];
    /**
     * Listener metadatas with "BEFORE RECOVER" type.
     */
    beforeRecoverListeners: EntityListenerMetadata[];
    /**
     * Listener metadatas with "AFTER REMOVE" type.
     */
    afterRemoveListeners: EntityListenerMetadata[];
    /**
     * Listener metadatas with "AFTER SOFT REMOVE" type.
     */
    afterSoftRemoveListeners: EntityListenerMetadata[];
    /**
     * Listener metadatas with "AFTER RECOVER" type.
     */
    afterRecoverListeners: EntityListenerMetadata[];
    /**
     * Map of columns and relations of the entity.
     *
     * example: Post{ id: number, name: string, counterEmbed: { count: number }, category: Category }.
     * This method will create following object:
     * { id: "id", counterEmbed: { count: "counterEmbed.count" }, category: "category" }
     */
    propertiesMap: ObjectLiteral;
    /**
     * Table comment. Not supported by all database types.
     */
    comment?: string;
    constructor(options: {
        connection: DataSource;
        inheritanceTree?: Function[];
        inheritancePattern?: "STI";
        tableTree?: TreeMetadataArgs;
        parentClosureEntityMetadata?: EntityMetadata;
        args: TableMetadataArgs;
    });
    /**
     * Creates a new entity.
     */
    create(queryRunner?: QueryRunner, options?: {
        fromDeserializer?: boolean;
        pojo?: boolean;
    }): any;
    /**
     * Checks if given entity has an id.
     */
    hasId(entity: ObjectLiteral): boolean;
    /**
     * Checks if given entity / object contains ALL primary keys entity must have.
     * Returns true if it contains all of them, false if at least one of them is not defined.
     */
    hasAllPrimaryKeys(entity: ObjectLiteral): boolean;
    /**
     * Ensures that given object is an entity id map.
     * If given id is an object then it means its already id map.
     * If given id isn't an object then it means its a value of the id column
     * and it creates a new id map with this value and name of the primary column.
     */
    ensureEntityIdMap(id: any): ObjectLiteral;
    /**
     * Gets primary keys of the entity and returns them in a literal object.
     * For example, for Post{ id: 1, title: "hello" } where id is primary it will return { id: 1 }
     * For multiple primary keys it returns multiple keys in object.
     * For primary keys inside embeds it returns complex object literal with keys in them.
     */
    getEntityIdMap(entity: ObjectLiteral | undefined): ObjectLiteral | undefined;
    /**
     * Creates a "mixed id map".
     * If entity has multiple primary keys (ids) then it will return just regular id map, like what getEntityIdMap returns.
     * But if entity has a single primary key then it will return just value of the id column of the entity, just value.
     * This is called mixed id map.
     */
    getEntityIdMixedMap(entity: ObjectLiteral | undefined): ObjectLiteral | undefined;
    /**
     * Compares two different entities by their ids.
     * Returns true if they match, false otherwise.
     */
    compareEntities(firstEntity: ObjectLiteral, secondEntity: ObjectLiteral): boolean;
    /**
     * Finds column with a given property name.
     */
    findColumnWithPropertyName(propertyName: string): ColumnMetadata | undefined;
    /**
     * Finds column with a given database name.
     */
    findColumnWithDatabaseName(databaseName: string): ColumnMetadata | undefined;
    /**
     * Checks if there is a column or relationship with a given property path.
     */
    hasColumnWithPropertyPath(propertyPath: string): boolean;
    /**
     * Finds column with a given property path.
     */
    findColumnWithPropertyPath(propertyPath: string): ColumnMetadata | undefined;
    /**
     * Finds column with a given property path.
     * Does not search in relation unlike findColumnWithPropertyPath.
     */
    findColumnWithPropertyPathStrict(propertyPath: string): ColumnMetadata | undefined;
    /**
     * Finds columns with a given property path.
     * Property path can match a relation, and relations can contain multiple columns.
     */
    findColumnsWithPropertyPath(propertyPath: string): ColumnMetadata[];
    /**
     * Checks if there is a relation with the given property path.
     */
    hasRelationWithPropertyPath(propertyPath: string): boolean;
    /**
     * Finds relation with the given property path.
     */
    findRelationWithPropertyPath(propertyPath: string): RelationMetadata | undefined;
    /**
     * Checks if there is an embedded with a given property path.
     */
    hasEmbeddedWithPropertyPath(propertyPath: string): boolean;
    /**
     * Finds embedded with a given property path.
     */
    findEmbeddedWithPropertyPath(propertyPath: string): EmbeddedMetadata | undefined;
    /**
     * Returns an array of databaseNames mapped from provided propertyPaths
     */
    mapPropertyPathsToColumns(propertyPaths: string[]): ColumnMetadata[];
    /**
     * Iterates through entity and finds and extracts all values from relations in the entity.
     * If relation value is an array its being flattened.
     */
    extractRelationValuesFromEntity(entity: ObjectLiteral, relations: RelationMetadata[]): [RelationMetadata, any, EntityMetadata][];
    /**
     * In the case of SingleTableInheritance, find the correct metadata
     * for a given value.
     *
     * @param value The value to find the metadata for.
     * @returns The found metadata for the entity or the base metadata if no matching metadata
     *          was found in the whole inheritance tree.
     */
    findInheritanceMetadata(value: any): EntityMetadata;
    private static getInverseEntityMetadata;
    /**
     * Creates a property paths for a given entity.
     *
     * @deprecated
     */
    static createPropertyPath(metadata: EntityMetadata, entity: ObjectLiteral, prefix?: string): string[];
    /**
     * Finds difference between two entity id maps.
     * Returns items that exist in the first array and absent in the second array.
     */
    static difference(firstIdMaps: ObjectLiteral[], secondIdMaps: ObjectLiteral[]): ObjectLiteral[];
    /**
     * Creates value map from the given values and columns.
     * Examples of usages are primary columns map and join columns map.
     */
    static getValueMap(entity: ObjectLiteral, columns: ColumnMetadata[], options?: {
        skipNulls?: boolean;
    }): ObjectLiteral | undefined;
    build(): void;
    /**
     * Registers a new column in the entity and recomputes all depend properties.
     */
    registerColumn(column: ColumnMetadata): void;
    /**
     * Creates a special object - all columns and relations of the object (plus columns and relations from embeds)
     * in a special format - { propertyName: propertyName }.
     *
     * example: Post{ id: number, name: string, counterEmbed: { count: number }, category: Category }.
     * This method will create following object:
     * { id: "id", counterEmbed: { count: "counterEmbed.count" }, category: "category" }
     */
    createPropertiesMap(): {
        [name: string]: string | any;
    };
    /**
     * Checks if entity has any column which rely on returning data,
     * e.g. columns with auto generated value, DEFAULT values considered as dependant of returning data.
     * For example, if we need to have RETURNING after INSERT (or we need returned id for DBs not supporting RETURNING),
     * it means we cannot execute bulk inserts in some cases.
     */
    getInsertionReturningColumns(): ColumnMetadata[];
}
