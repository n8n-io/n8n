import { FindManyOptions } from '../find-options/FindManyOptions';
import { ObjectLiteral } from '../common/ObjectLiteral';
import { FindOneOptions } from '../find-options/FindOneOptions';
import { DeepPartial } from '../common/DeepPartial';
import { SaveOptions } from './SaveOptions';
import { RemoveOptions } from './RemoveOptions';
import { EntityManager } from '../entity-manager/EntityManager';
import { QueryRunner } from '../query-runner/QueryRunner';
import { SelectQueryBuilder } from '../query-builder/SelectQueryBuilder';
import { DeleteResult } from '../query-builder/result/DeleteResult';
import { UpdateResult } from '../query-builder/result/UpdateResult';
import { InsertResult } from '../query-builder/result/InsertResult';
import { QueryDeepPartialEntity } from '../query-builder/QueryPartialEntity';
import { FindOptionsWhere } from '../find-options/FindOptionsWhere';
import { UpsertOptions } from './UpsertOptions';
import { EntityTarget } from '../common/EntityTarget';
import { PickKeysByType } from '../common/PickKeysByType';

/**
 * Repository is supposed to work with your entity objects. Find entities, insert, update, delete, etc.
 */
export class Repository<Entity extends ObjectLiteral> {
	// -------------------------------------------------------------------------
	// Public Properties
	// -------------------------------------------------------------------------

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

	// -------------------------------------------------------------------------
	// Accessors
	// -------------------------------------------------------------------------

	/**
	 * Entity metadata of the entity current repository manages.
	 */
	get metadata() {
		return this.manager.connection.getMetadata(this.target);
	}

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(target: EntityTarget<Entity>, manager: EntityManager, queryRunner?: QueryRunner) {
		this.target = target;
		this.manager = manager;
		this.queryRunner = queryRunner;
	}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Creates a new query builder that can be used to build a SQL query.
	 */
	createQueryBuilder(alias?: string, queryRunner?: QueryRunner): SelectQueryBuilder<Entity> {
		return this.manager.createQueryBuilder<Entity>(
			this.metadata.target as any,
			alias || this.metadata.targetName,
			queryRunner || this.queryRunner,
		);
	}

	/**
	 * Checks if entity has an id.
	 * If entity composite compose ids, it will check them all.
	 */
	hasId(entity: Entity): boolean {
		return this.manager.hasId(this.metadata.target, entity);
	}

	/**
	 * Gets entity mixed id.
	 */
	getId(entity: Entity): any {
		return this.manager.getId(this.metadata.target, entity);
	}

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
	 * Creates a new entity instance or instances.
	 * Can copy properties from the given object into new entities.
	 */
	create(
		plainEntityLikeOrPlainEntityLikes?: DeepPartial<Entity> | DeepPartial<Entity>[],
	): Entity | Entity[] {
		return this.manager.create(
			this.metadata.target as any,
			plainEntityLikeOrPlainEntityLikes as any,
		);
	}

	/**
	 * Merges multiple entities (or entity-like objects) into a given entity.
	 */
	merge(mergeIntoEntity: Entity, ...entityLikes: DeepPartial<Entity>[]): Entity {
		return this.manager.merge(this.metadata.target as any, mergeIntoEntity, ...entityLikes);
	}

	/**
	 * Creates a new entity from the given plain javascript object. If entity already exist in the database, then
	 * it loads it (and everything related to it), replaces all values with the new ones from the given object
	 * and returns this new entity. This new entity is actually a loaded from the db entity with all properties
	 * replaced from the new object.
	 *
	 * Note that given entity-like object must have an entity id / primary key to find entity by.
	 * Returns undefined if entity with given id was not found.
	 */
	preload(entityLike: DeepPartial<Entity>): Promise<Entity | undefined> {
		return this.manager.preload(this.metadata.target as any, entityLike);
	}

	/**
	 * Saves all given entities in the database.
	 * If entities do not exist in the database then inserts, otherwise updates.
	 */
	save<T extends DeepPartial<Entity>>(
		entities: T[],
		options: SaveOptions & { reload: false },
	): Promise<T[]>;

	/**
	 * Saves all given entities in the database.
	 * If entities do not exist in the database then inserts, otherwise updates.
	 */
	save<T extends DeepPartial<Entity>>(
		entities: T[],
		options?: SaveOptions,
	): Promise<(T & Entity)[]>;

	/**
	 * Saves a given entity in the database.
	 * If entity does not exist in the database then inserts, otherwise updates.
	 */
	save<T extends DeepPartial<Entity>>(
		entity: T,
		options: SaveOptions & { reload: false },
	): Promise<T>;

	/**
	 * Saves a given entity in the database.
	 * If entity does not exist in the database then inserts, otherwise updates.
	 */
	save<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;

	/**
	 * Saves one or many given entities.
	 */
	save<T extends DeepPartial<Entity>>(
		entityOrEntities: T | T[],
		options?: SaveOptions,
	): Promise<T | T[]> {
		return this.manager.save<Entity, T>(
			this.metadata.target as any,
			entityOrEntities as any,
			options,
		);
	}

	/**
	 * Removes a given entities from the database.
	 */
	remove(entities: Entity[], options?: RemoveOptions): Promise<Entity[]>;

	/**
	 * Removes a given entity from the database.
	 */
	remove(entity: Entity, options?: RemoveOptions): Promise<Entity>;

	/**
	 * Removes one or many given entities.
	 */
	remove(entityOrEntities: Entity | Entity[], options?: RemoveOptions): Promise<Entity | Entity[]> {
		return this.manager.remove(this.metadata.target as any, entityOrEntities as any, options);
	}

	/**
	 * Records the delete date of all given entities.
	 */
	softRemove<T extends DeepPartial<Entity>>(
		entities: T[],
		options: SaveOptions & { reload: false },
	): Promise<T[]>;

	/**
	 * Records the delete date of all given entities.
	 */
	softRemove<T extends DeepPartial<Entity>>(
		entities: T[],
		options?: SaveOptions,
	): Promise<(T & Entity)[]>;

	/**
	 * Records the delete date of a given entity.
	 */
	softRemove<T extends DeepPartial<Entity>>(
		entity: T,
		options: SaveOptions & { reload: false },
	): Promise<T>;

	/**
	 * Records the delete date of a given entity.
	 */
	softRemove<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;

	/**
	 * Records the delete date of one or many given entities.
	 */
	softRemove<T extends DeepPartial<Entity>>(
		entityOrEntities: T | T[],
		options?: SaveOptions,
	): Promise<T | T[]> {
		return this.manager.softRemove<Entity, T>(
			this.metadata.target as any,
			entityOrEntities as any,
			options,
		);
	}

	/**
	 * Recovers all given entities in the database.
	 */
	recover<T extends DeepPartial<Entity>>(
		entities: T[],
		options: SaveOptions & { reload: false },
	): Promise<T[]>;

	/**
	 * Recovers all given entities in the database.
	 */
	recover<T extends DeepPartial<Entity>>(
		entities: T[],
		options?: SaveOptions,
	): Promise<(T & Entity)[]>;

	/**
	 * Recovers a given entity in the database.
	 */
	recover<T extends DeepPartial<Entity>>(
		entity: T,
		options: SaveOptions & { reload: false },
	): Promise<T>;

	/**
	 * Recovers a given entity in the database.
	 */
	recover<T extends DeepPartial<Entity>>(entity: T, options?: SaveOptions): Promise<T & Entity>;

	/**
	 * Recovers one or many given entities.
	 */
	recover<T extends DeepPartial<Entity>>(
		entityOrEntities: T | T[],
		options?: SaveOptions,
	): Promise<T | T[]> {
		return this.manager.recover<Entity, T>(
			this.metadata.target as any,
			entityOrEntities as any,
			options,
		);
	}

	/**
	 * Inserts a given entity into the database.
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient INSERT query.
	 * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
	 */
	insert(
		entity: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[],
	): Promise<InsertResult> {
		return this.manager.insert(this.metadata.target as any, entity);
	}

	/**
	 * Updates entity partially. Entity can be found by a given conditions.
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient UPDATE query.
	 * Does not check if entity exist in the database.
	 */
	update(
		criteria: string | string[] | number | number[] | Date | Date[] | FindOptionsWhere<Entity>,
		partialEntity: QueryDeepPartialEntity<Entity>,
	): Promise<UpdateResult> {
		return this.manager.update(this.metadata.target as any, criteria as any, partialEntity);
	}

	/**
	 * Inserts a given entity into the database, unless a unique constraint conflicts then updates the entity
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient INSERT ... ON CONFLICT DO UPDATE/ON DUPLICATE KEY UPDATE query.
	 */
	upsert(
		entityOrEntities: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[],
		conflictPathsOrOptions: string[] | UpsertOptions<Entity>,
	): Promise<InsertResult> {
		return this.manager.upsert(
			this.metadata.target as any,
			entityOrEntities,
			conflictPathsOrOptions,
		);
	}

	/**
	 * Deletes entities by a given criteria.
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient DELETE query.
	 * Does not check if entity exist in the database.
	 */
	delete(
		criteria: string | string[] | number | number[] | Date | Date[] | FindOptionsWhere<Entity>,
	): Promise<DeleteResult> {
		return this.manager.delete(this.metadata.target as any, criteria as any);
	}

	/**
	 * Records the delete date of entities by a given criteria.
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient SOFT-DELETE query.
	 * Does not check if entity exist in the database.
	 */
	softDelete(
		criteria: string | string[] | number | number[] | Date | Date[] | FindOptionsWhere<Entity>,
	): Promise<UpdateResult> {
		return this.manager.softDelete(this.metadata.target as any, criteria as any);
	}

	/**
	 * Restores entities by a given criteria.
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient SOFT-DELETE query.
	 * Does not check if entity exist in the database.
	 */
	restore(
		criteria: string | string[] | number | number[] | Date | Date[] | FindOptionsWhere<Entity>,
	): Promise<UpdateResult> {
		return this.manager.restore(this.metadata.target as any, criteria as any);
	}

	/**
	 * Checks whether any entity exists that matches the given options.
	 *
	 * @deprecated use `exists` method instead, for example:
	 *
	 * .exists()
	 */
	exist(options?: FindManyOptions<Entity>): Promise<boolean> {
		return this.manager.exists(this.metadata.target, options);
	}

	/**
	 * Checks whether any entity exists that matches the given options.
	 */
	exists(options?: FindManyOptions<Entity>): Promise<boolean> {
		return this.manager.exists(this.metadata.target, options);
	}

	/**
	 * Checks whether any entity exists that matches the given conditions.
	 */
	existsBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<boolean> {
		return this.manager.existsBy(this.metadata.target, where);
	}

	/**
	 * Counts entities that match given options.
	 * Useful for pagination.
	 */
	count(options?: FindManyOptions<Entity>): Promise<number> {
		return this.manager.count(this.metadata.target, options);
	}

	/**
	 * Counts entities that match given conditions.
	 * Useful for pagination.
	 */
	countBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<number> {
		return this.manager.countBy(this.metadata.target, where);
	}

	/**
	 * Return the SUM of a column
	 */
	sum(
		columnName: PickKeysByType<Entity, number>,
		where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<number | null> {
		return this.manager.sum(this.metadata.target, columnName, where);
	}

	/**
	 * Return the AVG of a column
	 */
	average(
		columnName: PickKeysByType<Entity, number>,
		where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<number | null> {
		return this.manager.average(this.metadata.target, columnName, where);
	}

	/**
	 * Return the MIN of a column
	 */
	minimum(
		columnName: PickKeysByType<Entity, number>,
		where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<number | null> {
		return this.manager.minimum(this.metadata.target, columnName, where);
	}

	/**
	 * Return the MAX of a column
	 */
	maximum(
		columnName: PickKeysByType<Entity, number>,
		where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<number | null> {
		return this.manager.maximum(this.metadata.target, columnName, where);
	}

	/**
	 * Finds entities that match given find options.
	 */
	async find(options?: FindManyOptions<Entity>): Promise<Entity[]> {
		return this.manager.find(this.metadata.target, options);
	}

	/**
	 * Finds entities that match given find options.
	 */
	async findBy(where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[]): Promise<Entity[]> {
		return this.manager.findBy(this.metadata.target, where);
	}

	/**
	 * Finds entities that match given find options.
	 * Also counts all entities that match given conditions,
	 * but ignores pagination settings (from and take options).
	 */
	findAndCount(options?: FindManyOptions<Entity>): Promise<[Entity[], number]> {
		return this.manager.findAndCount(this.metadata.target, options);
	}

	/**
	 * Finds entities that match given WHERE conditions.
	 * Also counts all entities that match given conditions,
	 * but ignores pagination settings (from and take options).
	 */
	findAndCountBy(
		where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<[Entity[], number]> {
		return this.manager.findAndCountBy(this.metadata.target, where);
	}

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
	async findByIds(ids: any[]): Promise<Entity[]> {
		return this.manager.findByIds(this.metadata.target, ids);
	}

	/**
	 * Finds first entity by a given find options.
	 * If entity was not found in the database - returns null.
	 */
	async findOne(options: FindOneOptions<Entity>): Promise<Entity | null> {
		return this.manager.findOne(this.metadata.target, options);
	}

	/**
	 * Finds first entity that matches given where condition.
	 * If entity was not found in the database - returns null.
	 */
	async findOneBy(
		where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<Entity | null> {
		return this.manager.findOneBy(this.metadata.target, where);
	}

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
	async findOneById(id: number | string | Date): Promise<Entity | null> {
		return this.manager.findOneById(this.metadata.target, id);
	}

	/**
	 * Finds first entity by a given find options.
	 * If entity was not found in the database - rejects with error.
	 */
	async findOneOrFail(options: FindOneOptions<Entity>): Promise<Entity> {
		return this.manager.findOneOrFail(this.metadata.target, options);
	}

	/**
	 * Finds first entity that matches given where condition.
	 * If entity was not found in the database - rejects with error.
	 */
	async findOneByOrFail(
		where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<Entity> {
		return this.manager.findOneByOrFail(this.metadata.target, where);
	}

	/**
	 * Executes a raw SQL query and returns a raw database results.
	 * Raw query execution is supported only by relational databases (MongoDB is not supported).
	 */
	query(query: string, parameters?: any[]): Promise<any> {
		return this.manager.query(query, parameters);
	}

	/**
	 * Clears all the data from the given table/collection (truncates/drops it).
	 *
	 * Note: this method uses TRUNCATE and may not work as you expect in transactions on some platforms.
	 * @see https://stackoverflow.com/a/5972738/925151
	 */
	clear(): Promise<void> {
		return this.manager.clear(this.metadata.target);
	}

	/**
	 * Increments some column by provided value of the entities matched given conditions.
	 */
	increment(
		conditions: FindOptionsWhere<Entity>,
		propertyPath: string,
		value: number | string,
	): Promise<UpdateResult> {
		return this.manager.increment(this.metadata.target, conditions, propertyPath, value);
	}

	/**
	 * Decrements some column by provided value of the entities matched given conditions.
	 */
	decrement(
		conditions: FindOptionsWhere<Entity>,
		propertyPath: string,
		value: number | string,
	): Promise<UpdateResult> {
		return this.manager.decrement(this.metadata.target, conditions, propertyPath, value);
	}

	/**
	 * Extends repository with provided functions.
	 */
	extend<CustomRepository>(
		customs: CustomRepository & ThisType<this & CustomRepository>,
	): this & CustomRepository {
		// return {
		//     ...this,
		//     ...custom
		// };
		const thisRepo: any = this.constructor;
		const { target, manager, queryRunner } = this;
		const ChildClass = class extends thisRepo {
			constructor(target: EntityTarget<Entity>, manager: EntityManager, queryRunner?: QueryRunner) {
				super(target, manager, queryRunner);
			}
		};
		for (const custom in customs) ChildClass.prototype[custom] = customs[custom];
		return new ChildClass(target, manager, queryRunner) as any;
	}
}
