import { FindManyOptions } from "../find-options/FindManyOptions";
import { ObjectLiteral } from "../common/ObjectLiteral";
import { FindOneOptions } from "../find-options/FindOneOptions";
import { DeepPartial } from "../common/DeepPartial";
import { SaveOptions } from "./SaveOptions";
import { RemoveOptions } from "./RemoveOptions";
import { EntityManager } from "../entity-manager/EntityManager";
import { QueryRunner } from "../query-runner/QueryRunner";
import { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
import { DeleteResult } from "../query-builder/result/DeleteResult";
import { UpdateResult } from "../query-builder/result/UpdateResult";
import { InsertResult } from "../query-builder/result/InsertResult";
import { QueryDeepPartialEntity } from "../query-builder/QueryPartialEntity";
import { FindOptionsWhere } from "../find-options/FindOptionsWhere";
import { UpsertOptions } from "./UpsertOptions";
import { EntityTarget } from "../common/EntityTarget";
import { PickKeysByType } from "../common/PickKeysByType";
/**
 * Repository is supposed to work with your entity objects. Find entities, insert, update, delete, etc.
 */
export declare class Repository<Entity extends ObjectLiteral> {
    /**
     * Entity target that is managed by this repository.
     * If this repository manages entity from schema,
     * then it returns a name of that schema instead.
     */
    readonly target: EntityTarget<Entity>;
    /**
     * Entity Manager used by this repository.
     */
    readonly manager: EntityManager;
    /**
     * Query runner provider used for this repository.
     */
    readonly queryRunner?: QueryRunner;
    /**
     * Entity metadata of the entity current repository manages.
     */
    get metadata(): import("..").EntityMetadata;
    constructor(target: EntityTarget<Entity>, manager: EntityManager, queryRunner?: QueryRunner);
    /**
     * Creates a new query builder that can be used to build a SQL query.
     */
    createQueryBuilder(alias?: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity>;
    /**
     * Checks if entity has an id.
     * If entity composite compose ids, it will check them all.
     */
    hasId(entity: Entity): boolean;
    /**
     * Gets entity mixed id.
     */
    getId(entity: Entity): any;
    /**
     * Creates a new entity instance.
     */
    create(): Entity;
    /**
     * Creates new entities and copies all entity properties from given objects into their new entities.
     * Note that it copies only properties that are present in entity schema.
     */
    create(entityLikeArray: DeepPartial<Entity>[]): Entity[];
    /**
     * Creates a new entity instance and copies all entity properties from this object into a new entity.
     * Note that it copies only properties that are present in entity schema.
     */
    create(entityLike: DeepPartial<Entity>): Entity;
    /**
     * Merges multiple entities (or entity-like objects) into a given entity.
     */
    merge(mergeIntoEntity: Entity, ...entityLikes: DeepPartial<Entity>[]): Entity;
    /**
     * Creates a new entity from the given plain javascript object. If entity already exist in the database, then
     * it loads it (and everything related to it), replaces all values with the new ones from the given object
     * and returns this new entity. This new entity is actually a loaded from the db entity with all properties
     * replaced from the new object.
     *
     * Note that given entity-like object must have an entity id / primary key to find entity by.
     * Returns undefined if entity with given id was not found.
     */
    preload(entityLike: DeepPartial<Entity>): Promise<Entity | undefined>;
    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<T extends DeepPartial<Entity>>(entities: T[], options: SaveOptions & {
        reload: false;
    }): Promise<T[]>;
    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<T extends DeepPartial<Entity>>(entities: T[], options?: SaveOptions): Promise<(T & Entity)[]>;
    /**
     * Saves a given entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    save<T extends DeepPartial<Entity>>(entity: T, options: SaveOptions & {
        reload: false;
    }): Promise<T>;
    /**
     * Saves a given entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    save<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;
    /**
     * Removes a given entities from the database.
     */
    remove(entities: Entity[], options?: RemoveOptions): Promise<Entity[]>;
    /**
     * Removes a given entity from the database.
     */
    remove(entity: Entity, options?: RemoveOptions): Promise<Entity>;
    /**
     * Records the delete date of all given entities.
     */
    softRemove<T extends DeepPartial<Entity>>(entities: T[], options: SaveOptions & {
        reload: false;
    }): Promise<T[]>;
    /**
     * Records the delete date of all given entities.
     */
    softRemove<T extends DeepPartial<Entity>>(entities: T[], options?: SaveOptions): Promise<(T & Entity)[]>;
    /**
     * Records the delete date of a given entity.
     */
    softRemove<T extends DeepPartial<Entity>>(entity: T, options: SaveOptions & {
        reload: false;
    }): Promise<T>;
    /**
     * Records the delete date of a given entity.
     */
    softRemove<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;
    /**
     * Recovers all given entities in the database.
     */
    recover<T extends DeepPartial<Entity>>(entities: T[], options: SaveOptions & {
        reload: false;
    }): Promise<T[]>;
    /**
     * Recovers all given entities in the database.
     */
    recover<T extends DeepPartial<Entity>>(entities: T[], options?: SaveOptions): Promise<(T & Entity)[]>;
    /**
     * Recovers a given entity in the database.
     */
    recover<T extends DeepPartial<Entity>>(entity: T, options: SaveOptions & {
        reload: false;
    }): Promise<T>;
    /**
     * Recovers a given entity in the database.
     */
    recover<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;
    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     */
    insert(entity: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[]): Promise<InsertResult>;
    /**
     * Updates entity partially. Entity can be found by a given conditions.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     */
    update(criteria: string | string[] | number | number[] | Date | Date[] | FindOptionsWhere<Entity>, partialEntity: QueryDeepPartialEntity<Entity>): Promise<UpdateResult>;
    /**
     * Inserts a given entity into the database, unless a unique constraint conflicts then updates the entity
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT ... ON CONFLICT DO UPDATE/ON DUPLICATE KEY UPDATE query.
     */
    upsert(entityOrEntities: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[], conflictPathsOrOptions: string[] | UpsertOptions<Entity>): Promise<InsertResult>;
    /**
     * Deletes entities by a given criteria.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     */
    delete(criteria: string | string[] | number | number[] | Date | Date[] | FindOptionsWhere<Entity>): Promise<DeleteResult>;
    /**
     * Records the delete date of entities by a given criteria.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient SOFT-DELETE query.
     * Does not check if entity exist in the database.
     */
    softDelete(criteria: string | string[] | number | number[] | Date | Date[] | FindOptionsWhere<Entity>): Promise<UpdateResult>;
    /**
     * Restores entities by a given criteria.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient SOFT-DELETE query.
     * Does not check if entity exist in the database.
     */
    restore(criteria: string | string[] | number | number[] | Date | Date[] | FindOptionsWhere<Entity>): Promise<UpdateResult>;
    /**
     * Checks whether any entity exists that matches the given options.
     *
     * @deprecated use `exists` method instead, for example:
     *
     * .exists()
     */
    exist(options?: FindManyOptions<Entity>): Promise<boolean>;
    /**
     * Checks whether any entity exists that matches the given options.
     */
    exists(options?: FindManyOptions<Entity>): Promise<boolean>;
    /**
     * Checks whether any entity exists that matches the given conditions.
     */
    existsBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<boolean>;
    /**
     * Counts entities that match given options.
     * Useful for pagination.
     */
    count(options?: FindManyOptions<Entity>): Promise<number>;
    /**
     * Counts entities that match given conditions.
     * Useful for pagination.
     */
    countBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<number>;
    /**
     * Return the SUM of a column
     */
    sum(columnName: PickKeysByType<Entity, number>, where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<number | null>;
    /**
     * Return the AVG of a column
     */
    average(columnName: PickKeysByType<Entity, number>, where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<number | null>;
    /**
     * Return the MIN of a column
     */
    minimum(columnName: PickKeysByType<Entity, number>, where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<number | null>;
    /**
     * Return the MAX of a column
     */
    maximum(columnName: PickKeysByType<Entity, number>, where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<number | null>;
    /**
     * Finds entities that match given find options.
     */
    find(options?: FindManyOptions<Entity>): Promise<Entity[]>;
    /**
     * Finds entities that match given find options.
     */
    findBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<Entity[]>;
    /**
     * Finds entities that match given find options.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount(options?: FindManyOptions<Entity>): Promise<[Entity[], number]>;
    /**
     * Finds entities that match given WHERE conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCountBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<[Entity[], number]>;
    /**
     * Finds entities with ids.
     * Optionally find options or conditions can be applied.
     *
     * @deprecated use `findBy` method instead in conjunction with `In` operator, for example:
     *
     * .findBy({
     *     id: In([1, 2, 3])
     * })
     */
    findByIds(ids: any[]): Promise<Entity[]>;
    /**
     * Finds first entity by a given find options.
     * If entity was not found in the database - returns null.
     */
    findOne(options: FindOneOptions<Entity>): Promise<Entity | null>;
    /**
     * Finds first entity that matches given where condition.
     * If entity was not found in the database - returns null.
     */
    findOneBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<Entity | null>;
    /**
     * Finds first entity that matches given id.
     * If entity was not found in the database - returns null.
     *
     * @deprecated use `findOneBy` method instead in conjunction with `In` operator, for example:
     *
     * .findOneBy({
     *     id: 1 // where "id" is your primary column name
     * })
     */
    findOneById(id: number | string | Date): Promise<Entity | null>;
    /**
     * Finds first entity by a given find options.
     * If entity was not found in the database - rejects with error.
     */
    findOneOrFail(options: FindOneOptions<Entity>): Promise<Entity>;
    /**
     * Finds first entity that matches given where condition.
     * If entity was not found in the database - rejects with error.
     */
    findOneByOrFail(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<Entity>;
    /**
     * Executes a raw SQL query and returns a raw database results.
     * Raw query execution is supported only by relational databases (MongoDB is not supported).
     */
    query(query: string, parameters?: any[]): Promise<any>;
    /**
     * Clears all the data from the given table/collection (truncates/drops it).
     *
     * Note: this method uses TRUNCATE and may not work as you expect in transactions on some platforms.
     * @see https://stackoverflow.com/a/5972738/925151
     */
    clear(): Promise<void>;
    /**
     * Increments some column by provided value of the entities matched given conditions.
     */
    increment(conditions: FindOptionsWhere<Entity>, propertyPath: string, value: number | string): Promise<UpdateResult>;
    /**
     * Decrements some column by provided value of the entities matched given conditions.
     */
    decrement(conditions: FindOptionsWhere<Entity>, propertyPath: string, value: number | string): Promise<UpdateResult>;
    /**
     * Extends repository with provided functions.
     */
    extend<CustomRepository>(customs: CustomRepository & ThisType<this & CustomRepository>): this & CustomRepository;
}
