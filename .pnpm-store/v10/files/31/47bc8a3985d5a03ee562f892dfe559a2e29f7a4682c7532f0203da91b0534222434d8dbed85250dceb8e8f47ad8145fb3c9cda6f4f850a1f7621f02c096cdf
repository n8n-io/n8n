import { DataSource } from "../data-source/DataSource";
import { FindManyOptions } from "../find-options/FindManyOptions";
import { EntityTarget } from "../common/EntityTarget";
import { ObjectType } from "../common/ObjectType";
import { FindOneOptions } from "../find-options/FindOneOptions";
import { DeepPartial } from "../common/DeepPartial";
import { RemoveOptions } from "../repository/RemoveOptions";
import { SaveOptions } from "../repository/SaveOptions";
import { TreeRepository } from "../repository/TreeRepository";
import { Repository } from "../repository/Repository";
import { PlainObjectToNewEntityTransformer } from "../query-builder/transformer/PlainObjectToNewEntityTransformer";
import { QueryRunner } from "../query-runner/QueryRunner";
import { SelectQueryBuilder } from "../query-builder/SelectQueryBuilder";
import { QueryDeepPartialEntity } from "../query-builder/QueryPartialEntity";
import { InsertResult } from "../query-builder/result/InsertResult";
import { UpdateResult } from "../query-builder/result/UpdateResult";
import { DeleteResult } from "../query-builder/result/DeleteResult";
import { FindOptionsWhere } from "../find-options/FindOptionsWhere";
import { IsolationLevel } from "../driver/types/IsolationLevel";
import { UpsertOptions } from "../repository/UpsertOptions";
import { ObjectLiteral } from "../common/ObjectLiteral";
import { PickKeysByType } from "../common/PickKeysByType";
/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 */
export declare class EntityManager {
    readonly "@instanceof": symbol;
    /**
     * Connection used by this entity manager.
     */
    readonly connection: DataSource;
    /**
     * Custom query runner to be used for operations in this entity manager.
     * Used only in non-global entity manager.
     */
    readonly queryRunner?: QueryRunner;
    /**
     * Once created and then reused by repositories.
     * Created as a future replacement for the #repositories to provide a bit more perf optimization.
     */
    protected repositories: Map<EntityTarget<any>, Repository<any>>;
    /**
     * Once created and then reused by repositories.
     */
    protected treeRepositories: TreeRepository<any>[];
    /**
     * Plain to object transformer used in create and merge operations.
     */
    protected plainObjectToEntityTransformer: PlainObjectToNewEntityTransformer;
    constructor(connection: DataSource, queryRunner?: QueryRunner);
    /**
     * Wraps given function execution (and all operations made there) in a transaction.
     * All database operations must be executed using provided entity manager.
     */
    transaction<T>(runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;
    /**
     * Wraps given function execution (and all operations made there) in a transaction.
     * All database operations must be executed using provided entity manager.
     */
    transaction<T>(isolationLevel: IsolationLevel, runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;
    /**
     * Executes raw SQL query and returns raw database results.
     */
    query<T = any>(query: string, parameters?: any[]): Promise<T>;
    /**
     * Creates a new query builder that can be used to build a SQL query.
     */
    createQueryBuilder<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, alias: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity>;
    /**
     * Creates a new query builder that can be used to build a SQL query.
     */
    createQueryBuilder(queryRunner?: QueryRunner): SelectQueryBuilder<any>;
    /**
     * Checks if entity has an id.
     */
    hasId(entity: any): boolean;
    /**
     * Checks if entity of given schema name has an id.
     */
    hasId(target: Function | string, entity: any): boolean;
    /**
     * Gets entity mixed id.
     */
    getId(entity: any): any;
    /**
     * Gets entity mixed id.
     */
    getId(target: EntityTarget<any>, entity: any): any;
    /**
     * Creates a new entity instance and copies all entity properties from this object into a new entity.
     * Note that it copies only properties that present in entity schema.
     */
    create<Entity, EntityLike extends DeepPartial<Entity>>(entityClass: EntityTarget<Entity>, plainObject?: EntityLike): Entity;
    /**
     * Creates a new entities and copies all entity properties from given objects into their new entities.
     * Note that it copies only properties that present in entity schema.
     */
    create<Entity, EntityLike extends DeepPartial<Entity>>(entityClass: EntityTarget<Entity>, plainObjects?: EntityLike[]): Entity[];
    /**
     * Merges two entities into one new entity.
     */
    merge<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, mergeIntoEntity: Entity, ...entityLikes: DeepPartial<Entity>[]): Entity;
    /**
     * Creates a new entity from the given plain javascript object. If entity already exist in the database, then
     * it loads it (and everything related to it), replaces all values with the new ones from the given object
     * and returns this new entity. This new entity is actually a loaded from the db entity with all properties
     * replaced from the new object.
     */
    preload<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, entityLike: DeepPartial<Entity>): Promise<Entity | undefined>;
    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<Entity>(entities: Entity[], options?: SaveOptions): Promise<Entity[]>;
    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<Entity>(entity: Entity, options?: SaveOptions): Promise<Entity>;
    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entities: T[], options: SaveOptions & {
        reload: false;
    }): Promise<T[]>;
    /**
     * Saves all given entities in the database.
     * If entities do not exist in the database then inserts, otherwise updates.
     */
    save<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entities: T[], options?: SaveOptions): Promise<(T & Entity)[]>;
    /**
     * Saves a given entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    save<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entity: T, options: SaveOptions & {
        reload: false;
    }): Promise<T>;
    /**
     * Saves a given entity in the database.
     * If entity does not exist in the database then inserts, otherwise updates.
     */
    save<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entity: T, options?: SaveOptions): Promise<T & Entity>;
    /**
     * Removes a given entity from the database.
     */
    remove<Entity>(entity: Entity, options?: RemoveOptions): Promise<Entity>;
    /**
     * Removes a given entity from the database.
     */
    remove<Entity>(targetOrEntity: EntityTarget<Entity>, entity: Entity, options?: RemoveOptions): Promise<Entity>;
    /**
     * Removes a given entity from the database.
     */
    remove<Entity>(entity: Entity[], options?: RemoveOptions): Promise<Entity>;
    /**
     * Removes a given entity from the database.
     */
    remove<Entity>(targetOrEntity: EntityTarget<Entity>, entity: Entity[], options?: RemoveOptions): Promise<Entity[]>;
    /**
     * Records the delete date of all given entities.
     */
    softRemove<Entity>(entities: Entity[], options?: SaveOptions): Promise<Entity[]>;
    /**
     * Records the delete date of a given entity.
     */
    softRemove<Entity>(entity: Entity, options?: SaveOptions): Promise<Entity>;
    /**
     * Records the delete date of all given entities.
     */
    softRemove<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entities: T[], options?: SaveOptions): Promise<T[]>;
    /**
     * Records the delete date of a given entity.
     */
    softRemove<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entity: T, options?: SaveOptions): Promise<T>;
    /**
     * Recovers all given entities.
     */
    recover<Entity>(entities: Entity[], options?: SaveOptions): Promise<Entity[]>;
    /**
     * Recovers a given entity.
     */
    recover<Entity>(entity: Entity, options?: SaveOptions): Promise<Entity>;
    /**
     * Recovers all given entities.
     */
    recover<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entities: T[], options?: SaveOptions): Promise<T[]>;
    /**
     * Recovers a given entity.
     */
    recover<Entity, T extends DeepPartial<Entity>>(targetOrEntity: EntityTarget<Entity>, entity: T, options?: SaveOptions): Promise<T>;
    /**
     * Inserts a given entity into the database.
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient INSERT query.
     * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
     * You can execute bulk inserts using this method.
     */
    insert<Entity extends ObjectLiteral>(target: EntityTarget<Entity>, entity: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[]): Promise<InsertResult>;
    upsert<Entity extends ObjectLiteral>(target: EntityTarget<Entity>, entityOrEntities: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[], conflictPathsOrOptions: string[] | UpsertOptions<Entity>): Promise<InsertResult>;
    /**
     * Updates entity partially. Entity can be found by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient UPDATE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    update<Entity extends ObjectLiteral>(target: EntityTarget<Entity>, criteria: string | string[] | number | number[] | Date | Date[] | any, partialEntity: QueryDeepPartialEntity<Entity>): Promise<UpdateResult>;
    /**
     * Deletes entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    delete<Entity extends ObjectLiteral>(targetOrEntity: EntityTarget<Entity>, criteria: string | string[] | number | number[] | Date | Date[] | any): Promise<DeleteResult>;
    /**
     * Records the delete date of entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    softDelete<Entity extends ObjectLiteral>(targetOrEntity: EntityTarget<Entity>, criteria: string | string[] | number | number[] | Date | Date[] | any): Promise<UpdateResult>;
    /**
     * Restores entities by a given condition(s).
     * Unlike save method executes a primitive operation without cascades, relations and other operations included.
     * Executes fast and efficient DELETE query.
     * Does not check if entity exist in the database.
     * Condition(s) cannot be empty.
     */
    restore<Entity extends ObjectLiteral>(targetOrEntity: EntityTarget<Entity>, criteria: string | string[] | number | number[] | Date | Date[] | any): Promise<UpdateResult>;
    /**
     * Checks whether any entity exists with the given options.
     */
    exists<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, options?: FindManyOptions<Entity>): Promise<boolean>;
    /**
     * Checks whether any entity exists with the given conditions.
     */
    existsBy<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<boolean>;
    /**
     * Counts entities that match given options.
     * Useful for pagination.
     */
    count<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, options?: FindManyOptions<Entity>): Promise<number>;
    /**
     * Counts entities that match given conditions.
     * Useful for pagination.
     */
    countBy<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<number>;
    /**
     * Return the SUM of a column
     */
    sum<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, columnName: PickKeysByType<Entity, number>, where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<number | null>;
    /**
     * Return the AVG of a column
     */
    average<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, columnName: PickKeysByType<Entity, number>, where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<number | null>;
    /**
     * Return the MIN of a column
     */
    minimum<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, columnName: PickKeysByType<Entity, number>, where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<number | null>;
    /**
     * Return the MAX of a column
     */
    maximum<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, columnName: PickKeysByType<Entity, number>, where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<number | null>;
    private callAggregateFun;
    /**
     * Finds entities that match given find options.
     */
    find<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, options?: FindManyOptions<Entity>): Promise<Entity[]>;
    /**
     * Finds entities that match given find options.
     */
    findBy<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<Entity[]>;
    /**
     * Finds entities that match given find options.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCount<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, options?: FindManyOptions<Entity>): Promise<[Entity[], number]>;
    /**
     * Finds entities that match given WHERE conditions.
     * Also counts all entities that match given conditions,
     * but ignores pagination settings (from and take options).
     */
    findAndCountBy<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<[Entity[], number]>;
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
    findByIds<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, ids: any[]): Promise<Entity[]>;
    /**
     * Finds first entity by a given find options.
     * If entity was not found in the database - returns null.
     */
    findOne<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, options: FindOneOptions<Entity>): Promise<Entity | null>;
    /**
     * Finds first entity that matches given where condition.
     * If entity was not found in the database - returns null.
     */
    findOneBy<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<Entity | null>;
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
    findOneById<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, id: number | string | Date): Promise<Entity | null>;
    /**
     * Finds first entity by a given find options.
     * If entity was not found in the database - rejects with error.
     */
    findOneOrFail<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, options: FindOneOptions<Entity>): Promise<Entity>;
    /**
     * Finds first entity that matches given where condition.
     * If entity was not found in the database - rejects with error.
     */
    findOneByOrFail<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<Entity>;
    /**
     * Clears all the data from the given table (truncates/drops it).
     *
     * Note: this method uses TRUNCATE and may not work as you expect in transactions on some platforms.
     * @see https://stackoverflow.com/a/5972738/925151
     */
    clear<Entity>(entityClass: EntityTarget<Entity>): Promise<void>;
    /**
     * Increments some column by provided value of the entities matched given conditions.
     */
    increment<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, conditions: any, propertyPath: string, value: number | string): Promise<UpdateResult>;
    /**
     * Decrements some column by provided value of the entities matched given conditions.
     */
    decrement<Entity extends ObjectLiteral>(entityClass: EntityTarget<Entity>, conditions: any, propertyPath: string, value: number | string): Promise<UpdateResult>;
    /**
     * Gets repository for the given entity class or name.
     * If single database connection mode is used, then repository is obtained from the
     * repository aggregator, where each repository is individually created for this entity manager.
     * When single database connection is not used, repository is being obtained from the connection.
     */
    getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Repository<Entity>;
    /**
     * Gets tree repository for the given entity class or name.
     * If single database connection mode is used, then repository is obtained from the
     * repository aggregator, where each repository is individually created for this entity manager.
     * When single database connection is not used, repository is being obtained from the connection.
     */
    getTreeRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): TreeRepository<Entity>;
    /**
     * Creates a new repository instance out of a given Repository and
     * sets current EntityManager instance to it. Used to work with custom repositories
     * in transactions.
     */
    withRepository<Entity extends ObjectLiteral, R extends Repository<any>>(repository: R & Repository<Entity>): R;
    /**
     * Gets custom entity repository marked with @EntityRepository decorator.
     *
     * @deprecated use Repository.extend to create custom repositories
     */
    getCustomRepository<T>(customRepository: ObjectType<T>): T;
    /**
     * Releases all resources used by entity manager.
     * This is used when entity manager is created with a single query runner,
     * and this single query runner needs to be released after job with entity manager is done.
     */
    release(): Promise<void>;
}
