import { RelationType } from "./types/RelationTypes";
import { EntityMetadata } from "./EntityMetadata";
import { ForeignKeyMetadata } from "./ForeignKeyMetadata";
import { ObjectLiteral } from "../common/ObjectLiteral";
import { ColumnMetadata } from "./ColumnMetadata";
import { EmbeddedMetadata } from "./EmbeddedMetadata";
import { RelationMetadataArgs } from "../metadata-args/RelationMetadataArgs";
import { DeferrableType } from "./types/DeferrableType";
import { OnUpdateType } from "./types/OnUpdateType";
import { OnDeleteType } from "./types/OnDeleteType";
import { PropertyTypeFactory } from "./types/PropertyTypeInFunction";
/**
 * Contains all information about some entity's relation.
 */
export declare class RelationMetadata {
    /**
     * Entity metadata of the entity where this relation is placed.
     *
     * For example for @ManyToMany(type => Category) in Post, entityMetadata will be metadata of Post entity.
     */
    entityMetadata: EntityMetadata;
    /**
     * Entity metadata of the entity that is targeted by this relation.
     *
     * For example for @ManyToMany(type => Category) in Post, inverseEntityMetadata will be metadata of Category entity.
     */
    inverseEntityMetadata: EntityMetadata;
    /**
     * Entity metadata of the junction table.
     * Junction tables have their own entity metadata objects.
     * Defined only for many-to-many relations.
     */
    junctionEntityMetadata?: EntityMetadata;
    /**
     * Embedded metadata where this relation is.
     * If this relation is not in embed then this property value is undefined.
     */
    embeddedMetadata?: EmbeddedMetadata;
    /**
     * Relation type, e.g. is it one-to-one, one-to-many, many-to-one or many-to-many.
     */
    relationType: RelationType;
    /**
     * Target entity to which this relation is applied.
     * Target IS NOT equal to entityMetadata.target, because relation
     *
     * For example for @ManyToMany(type => Category) in Post, target will be Post.
     * If @ManyToMany(type => Category) is in Counters which is embedded into Post, target will be Counters.
     * If @ManyToMany(type => Category) is in abstract class BaseUser which Post extends, target will be BaseUser.
     * Target can be string if its defined in entity schema instead of class.
     */
    target: Function | string;
    /**
     * Target's property name to which relation decorator is applied.
     */
    propertyName: string;
    /**
     * Gets full path to this column property (including relation name).
     * Full path is relevant when column is used in embeds (one or multiple nested).
     * For example it will return "counters.subcounters.likes".
     * If property is not in embeds then it returns just property name of the column.
     */
    propertyPath: string;
    /**
     * Indicates if this is a parent (can be only many-to-one relation) relation in the tree tables.
     */
    isTreeParent: boolean;
    /**
     * Indicates if this is a children (can be only one-to-many relation) relation in the tree tables.
     */
    isTreeChildren: boolean;
    /**
     * Indicates if this relation's column is a primary key.
     * Can be used only for many-to-one and owner one-to-one relations.
     */
    isPrimary: boolean;
    /**
     * Indicates if this relation is lazily loaded.
     */
    isLazy: boolean;
    /**
     * Indicates if this relation is eagerly loaded.
     */
    isEager: boolean;
    /**
     * Indicates if persistence is enabled for the relation.
     * By default its enabled, but if you want to avoid any changes in the relation to be reflected in the database you can disable it.
     * If its disabled you can only change a relation from inverse side of a relation or using relation query builder functionality.
     * This is useful for performance optimization since its disabling avoid multiple extra queries during entity save.
     */
    persistenceEnabled: boolean;
    /**
     * When a parent is saved (with cascading but) without a child row that still exists in database, this will control what shall happen to them.
     * delete will remove these rows from database. nullify will remove the relation key.
     * skip will keep the relation intact. Removal of related item is only possible through its own repo.
     */
    orphanedRowAction?: "nullify" | "delete" | "soft-delete" | "disable";
    /**
     * If set to true then related objects are allowed to be inserted to the database.
     */
    isCascadeInsert: boolean;
    /**
     * If set to true then related objects are allowed to be updated in the database.
     */
    isCascadeUpdate: boolean;
    /**
     * If set to true then related objects are allowed to be remove from the database.
     */
    isCascadeRemove: boolean;
    /**
     * If set to true then related objects are allowed to be soft-removed from the database.
     */
    isCascadeSoftRemove: boolean;
    /**
     * If set to true then related objects are allowed to be recovered from the database.
     */
    isCascadeRecover: boolean;
    /**
     * Indicates if relation column value can be nullable or not.
     */
    isNullable: boolean;
    /**
     * What to do with a relation on deletion of the row containing a foreign key.
     */
    onDelete?: OnDeleteType;
    /**
     * What to do with a relation on update of the row containing a foreign key.
     */
    onUpdate?: OnUpdateType;
    /**
     * What to do with a relation on update of the row containing a foreign key.
     */
    deferrable?: DeferrableType;
    /**
     * Indicates whether foreign key constraints will be created for join columns.
     * Can be used only for many-to-one and owner one-to-one relations.
     * Defaults to true.
     */
    createForeignKeyConstraints: boolean;
    /**
     * Gets the property's type to which this relation is applied.
     *
     * For example for @ManyToMany(type => Category) in Post, target will be Category.
     */
    type: Function | string;
    /**
     * Indicates if this side is an owner of this relation.
     */
    isOwning: boolean;
    /**
     * Checks if this relation's type is "one-to-one".
     */
    isOneToOne: boolean;
    /**
     * Checks if this relation is owner side of the "one-to-one" relation.
     * Owner side means this side of relation has a join column in the table.
     */
    isOneToOneOwner: boolean;
    /**
     * Checks if this relation has a join column (e.g. is it many-to-one or one-to-one owner side).
     */
    isWithJoinColumn: boolean;
    /**
     * Checks if this relation is NOT owner side of the "one-to-one" relation.
     * NOT owner side means this side of relation does not have a join column in the table.
     */
    isOneToOneNotOwner: boolean;
    /**
     * Checks if this relation's type is "one-to-many".
     */
    isOneToMany: boolean;
    /**
     * Checks if this relation's type is "many-to-one".
     */
    isManyToOne: boolean;
    /**
     * Checks if this relation's type is "many-to-many".
     */
    isManyToMany: boolean;
    /**
     * Checks if this relation's type is "many-to-many", and is owner side of the relationship.
     * Owner side means this side of relation has a join table.
     */
    isManyToManyOwner: boolean;
    /**
     * Checks if this relation's type is "many-to-many", and is NOT owner side of the relationship.
     * Not owner side means this side of relation does not have a join table.
     */
    isManyToManyNotOwner: boolean;
    /**
     * Gets the property path of the inverse side of the relation.
     */
    inverseSidePropertyPath: string;
    /**
     * Inverse side of the relation set by user.
     *
     * Inverse side set in the relation can be either string - property name of the column on inverse side,
     * either can be a function that accepts a map of properties with the object and returns one of them.
     * Second approach is used to achieve type-safety.
     */
    givenInverseSidePropertyFactory: PropertyTypeFactory<any>;
    /**
     * Gets the relation metadata of the inverse side of this relation.
     */
    inverseRelation?: RelationMetadata;
    /**
     * Join table name.
     */
    joinTableName: string;
    /**
     * Foreign keys created for this relation.
     */
    foreignKeys: ForeignKeyMetadata[];
    /**
     * Join table columns.
     * Join columns can be obtained only from owner side of the relation.
     * From non-owner side of the relation join columns will be empty.
     * If this relation is a many-to-one/one-to-one then it takes join columns from the current entity.
     * If this relation is many-to-many then it takes all owner join columns from the junction entity.
     */
    joinColumns: ColumnMetadata[];
    /**
     * Inverse join table columns.
     * Inverse join columns are supported only for many-to-many relations
     * and can be obtained only from owner side of the relation.
     * From non-owner side of the relation join columns will be undefined.
     */
    inverseJoinColumns: ColumnMetadata[];
    constructor(options: {
        entityMetadata: EntityMetadata;
        embeddedMetadata?: EmbeddedMetadata;
        args: RelationMetadataArgs;
    });
    /**
     * Creates join column ids map from the given related entity ids array.
     */
    getRelationIdMap(entity: ObjectLiteral): ObjectLiteral | undefined;
    /**
     * Ensures that given object is an entity id map.
     * If given id is an object then it means its already id map.
     * If given id isn't an object then it means its a value of the id column
     * and it creates a new id map with this value and name of the primary column.
     */
    ensureRelationIdMap(id: any): ObjectLiteral;
    /**
     * Extracts column value from the given entity.
     * If column is in embedded (or recursive embedded) it extracts its value from there.
     */
    getEntityValue(entity: ObjectLiteral, getLazyRelationsPromiseValue?: boolean): any | undefined;
    /**
     * Sets given entity's relation's value.
     * Using of this method helps to set entity relation's value of the lazy and non-lazy relations.
     *
     * If merge is set to true, it merges given value into currently
     */
    setEntityValue(entity: ObjectLiteral, value: any): void;
    /**
     * Creates entity id map from the given entity ids array.
     */
    createValueMap(value: any): any;
    /**
     * Builds some depend relation metadata properties.
     * This builder method should be used only after embedded metadata tree was build.
     */
    build(): void;
    /**
     * Registers given foreign keys in the relation.
     * This builder method should be used to register foreign key in the relation.
     */
    registerForeignKeys(...foreignKeys: ForeignKeyMetadata[]): void;
    /**
     * Registers given join columns in the relation.
     * This builder method should be used to register join column in the relation.
     */
    registerJoinColumns(joinColumns?: ColumnMetadata[], inverseJoinColumns?: ColumnMetadata[]): void;
    /**
     * Registers a given junction entity metadata.
     * This builder method can be called after junction entity metadata for the many-to-many relation was created.
     */
    registerJunctionEntityMetadata(junctionEntityMetadata: EntityMetadata): void;
    /**
     * Builds inverse side property path based on given inverse side property factory.
     * This builder method should be used only after properties map of the inverse entity metadata was build.
     */
    buildInverseSidePropertyPath(): string;
    /**
     * Builds relation's property path based on its embedded tree.
     */
    buildPropertyPath(): string;
}
