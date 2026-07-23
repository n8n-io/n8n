import { Repository } from './Repository';
import { FindOptionsWhere } from '../find-options/FindOptionsWhere';
import { DeepPartial } from '../common/DeepPartial';
import { SaveOptions } from './SaveOptions';
import { FindOneOptions } from '../find-options/FindOneOptions';
import { RemoveOptions } from './RemoveOptions';
import { FindManyOptions } from '../find-options/FindManyOptions';
import { DataSource } from '../data-source';
import { SelectQueryBuilder } from '../query-builder/SelectQueryBuilder';
import { InsertResult } from '../query-builder/result/InsertResult';
import { UpdateResult } from '../query-builder/result/UpdateResult';
import { DeleteResult } from '../query-builder/result/DeleteResult';
import { ObjectUtils } from '../util/ObjectUtils';
import { QueryDeepPartialEntity } from '../query-builder/QueryPartialEntity';
import { UpsertOptions } from './UpsertOptions';
import { EntityTarget } from '../common/EntityTarget';
import { PickKeysByType } from '../common/PickKeysByType';

/**
 * Base abstract entity for all entities, used in ActiveRecord patterns.
 */
export class BaseEntity {
	// -------------------------------------------------------------------------
	// Private Static Properties
	// -------------------------------------------------------------------------

	/**
	 * DataSource used in all static methods of the BaseEntity.
	 */
	private static dataSource: DataSource | null;

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Checks if entity has an id.
	 * If entity composite compose ids, it will check them all.
	 */
	hasId(): boolean {
		const baseEntity = this.constructor as typeof BaseEntity;
		return baseEntity.getRepository().hasId(this);
	}

	/**
	 * Saves current entity in the database.
	 * If entity does not exist in the database then inserts, otherwise updates.
	 */
	save(options?: SaveOptions): Promise<this> {
		const baseEntity = this.constructor as typeof BaseEntity;
		return baseEntity.getRepository().save(this, options);
	}

	/**
	 * Removes current entity from the database.
	 */
	remove(options?: RemoveOptions): Promise<this> {
		const baseEntity = this.constructor as typeof BaseEntity;
		return baseEntity.getRepository().remove(this, options) as Promise<this>;
	}

	/**
	 * Records the delete date of current entity.
	 */
	softRemove(options?: SaveOptions): Promise<this> {
		const baseEntity = this.constructor as typeof BaseEntity;
		return baseEntity.getRepository().softRemove(this, options);
	}

	/**
	 * Recovers a given entity in the database.
	 */
	recover(options?: SaveOptions): Promise<this> {
		const baseEntity = this.constructor as typeof BaseEntity;
		return baseEntity.getRepository().recover(this, options);
	}

	/**
	 * Reloads entity data from the database.
	 */
	async reload(): Promise<void> {
		const baseEntity = this.constructor as typeof BaseEntity;
		const id = baseEntity.getRepository().metadata.getEntityIdMap(this);
		if (!id) {
			throw new Error(`Entity doesn't have id-s set, cannot reload entity`);
		}
		const reloadedEntity: BaseEntity = await baseEntity.getRepository().findOneByOrFail(id);

		ObjectUtils.assign(this, reloadedEntity);
	}

	// -------------------------------------------------------------------------
	// Public Static Methods
	// -------------------------------------------------------------------------

	/**
	 * Sets DataSource to be used by entity.
	 */
	static useDataSource(dataSource: DataSource | null) {
		this.dataSource = dataSource;
	}

	/**
	 * Gets current entity's Repository.
	 */
	static getRepository<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
	): Repository<T> {
		const dataSource = (this as typeof BaseEntity).dataSource;
		if (!dataSource) throw new Error(`DataSource is not set for this entity.`);
		return dataSource.getRepository<T>(this);
	}

	/**
	 * Returns object that is managed by this repository.
	 * If this repository manages entity from schema,
	 * then it returns a name of that schema instead.
	 */
	static get target(): EntityTarget<any> {
		return this.getRepository().target;
	}

	/**
	 * Checks entity has an id.
	 * If entity composite compose ids, it will check them all.
	 */
	static hasId(entity: BaseEntity): boolean {
		return this.getRepository().hasId(entity);
	}

	/**
	 * Gets entity mixed id.
	 */
	static getId<T extends BaseEntity>(this: { new (): T } & typeof BaseEntity, entity: T): any {
		return this.getRepository<T>().getId(entity);
	}

	/**
	 * Creates a new query builder that can be used to build a SQL query.
	 */
	static createQueryBuilder<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		alias?: string,
	): SelectQueryBuilder<T> {
		return this.getRepository<T>().createQueryBuilder(alias);
	}

	/**
	 * Creates a new entity instance.
	 */
	static create<T extends BaseEntity>(this: { new (): T } & typeof BaseEntity): T;

	/**
	 * Creates a new entities and copies all entity properties from given objects into their new entities.
	 * Note that it copies only properties that present in entity schema.
	 */
	static create<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entityLikeArray: DeepPartial<T>[],
	): T[];

	/**
	 * Creates a new entity instance and copies all entity properties from this object into a new entity.
	 * Note that it copies only properties that present in entity schema.
	 */
	static create<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entityLike: DeepPartial<T>,
	): T;

	/**
	 * Creates a new entity instance and copies all entity properties from this object into a new entity.
	 * Note that it copies only properties that present in entity schema.
	 */
	static create<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entityOrEntities?: any,
	) {
		return this.getRepository<T>().create(entityOrEntities);
	}

	/**
	 * Merges multiple entities (or entity-like objects) into a given entity.
	 */
	static merge<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		mergeIntoEntity: T,
		...entityLikes: DeepPartial<T>[]
	): T {
		return this.getRepository<T>().merge(mergeIntoEntity, ...entityLikes) as T;
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
	static preload<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entityLike: DeepPartial<T>,
	): Promise<T | undefined> {
		const thisRepository = this.getRepository<T>();
		return thisRepository.preload(entityLike);
	}

	/**
	 * Saves all given entities in the database.
	 * If entities do not exist in the database then inserts, otherwise updates.
	 */
	static save<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entities: DeepPartial<T>[],
		options?: SaveOptions,
	): Promise<T[]>;

	/**
	 * Saves a given entity in the database.
	 * If entity does not exist in the database then inserts, otherwise updates.
	 */
	static save<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entity: DeepPartial<T>,
		options?: SaveOptions,
	): Promise<T>;

	/**
	 * Saves one or many given entities.
	 */
	static save<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entityOrEntities: DeepPartial<T> | DeepPartial<T>[],
		options?: SaveOptions,
	) {
		return this.getRepository<T>().save(entityOrEntities as any, options);
	}

	/**
	 * Removes a given entities from the database.
	 */
	static remove<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entities: T[],
		options?: RemoveOptions,
	): Promise<T[]>;

	/**
	 * Removes a given entity from the database.
	 */
	static remove<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entity: T,
		options?: RemoveOptions,
	): Promise<T>;

	/**
	 * Removes one or many given entities.
	 */
	static remove<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entityOrEntities: T | T[],
		options?: RemoveOptions,
	) {
		return this.getRepository<T>().remove(entityOrEntities as any, options);
	}

	/**
	 * Records the delete date of all given entities.
	 */
	static softRemove<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entities: T[],
		options?: SaveOptions,
	): Promise<T[]>;

	/**
	 * Records the delete date of a given entity.
	 */
	static softRemove<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entity: T,
		options?: SaveOptions,
	): Promise<T>;

	/**
	 * Records the delete date of one or many given entities.
	 */
	static softRemove<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entityOrEntities: T | T[],
		options?: SaveOptions,
	) {
		return this.getRepository<T>().softRemove(entityOrEntities as any, options);
	}

	/**
	 * Inserts a given entity into the database.
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient INSERT query.
	 * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
	 */
	static insert<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entity: QueryDeepPartialEntity<T> | QueryDeepPartialEntity<T>[],
	): Promise<InsertResult> {
		return this.getRepository<T>().insert(entity);
	}

	/**
	 * Updates entity partially. Entity can be found by a given conditions.
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient UPDATE query.
	 * Does not check if entity exist in the database.
	 */
	static update<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		criteria: string | string[] | number | number[] | Date | Date[] | FindOptionsWhere<T>,
		partialEntity: QueryDeepPartialEntity<T>,
	): Promise<UpdateResult> {
		return this.getRepository<T>().update(criteria, partialEntity);
	}

	/**
	 * Inserts a given entity into the database, unless a unique constraint conflicts then updates the entity
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient INSERT ... ON CONFLICT DO UPDATE/ON DUPLICATE KEY UPDATE query.
	 */
	static upsert<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		entityOrEntities: QueryDeepPartialEntity<T> | QueryDeepPartialEntity<T>[],
		conflictPathsOrOptions: string[] | UpsertOptions<T>,
	): Promise<InsertResult> {
		return this.getRepository<T>().upsert(entityOrEntities, conflictPathsOrOptions);
	}

	/**
	 * Deletes entities by a given criteria.
	 * Unlike remove method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient DELETE query.
	 * Does not check if entity exist in the database.
	 */
	static delete<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		criteria: string | string[] | number | number[] | Date | Date[] | FindOptionsWhere<T>,
	): Promise<DeleteResult> {
		return this.getRepository<T>().delete(criteria);
	}

	/**
	 * Checks whether any entity exists that matches the given options.
	 */
	static exists<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		options?: FindManyOptions<T>,
	): Promise<boolean> {
		return this.getRepository<T>().exists(options);
	}

	/**
	 * Checks whether any entity exists that matches the given conditions.
	 */
	static existsBy<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		where: FindOptionsWhere<T>,
	): Promise<boolean> {
		return this.getRepository<T>().existsBy(where);
	}

	/**
	 * Counts entities that match given options.
	 */
	static count<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		options?: FindManyOptions<T>,
	): Promise<number> {
		return this.getRepository<T>().count(options);
	}

	/**
	 * Counts entities that match given WHERE conditions.
	 */
	static countBy<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		where: FindOptionsWhere<T>,
	): Promise<number> {
		return this.getRepository<T>().countBy(where);
	}

	/**
	 * Return the SUM of a column
	 */
	static sum<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		columnName: PickKeysByType<T, number>,
		where: FindOptionsWhere<T>,
	): Promise<number | null> {
		return this.getRepository<T>().sum(columnName, where);
	}

	/**
	 * Return the AVG of a column
	 */
	static average<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		columnName: PickKeysByType<T, number>,
		where: FindOptionsWhere<T>,
	): Promise<number | null> {
		return this.getRepository<T>().average(columnName, where);
	}

	/**
	 * Return the MIN of a column
	 */
	static minimum<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		columnName: PickKeysByType<T, number>,
		where: FindOptionsWhere<T>,
	): Promise<number | null> {
		return this.getRepository<T>().minimum(columnName, where);
	}

	/**
	 * Return the MAX of a column
	 */
	static maximum<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		columnName: PickKeysByType<T, number>,
		where: FindOptionsWhere<T>,
	): Promise<number | null> {
		return this.getRepository<T>().maximum(columnName, where);
	}

	/**
	 * Finds entities that match given options.
	 */
	static find<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		options?: FindManyOptions<T>,
	): Promise<T[]> {
		return this.getRepository<T>().find(options);
	}

	/**
	 * Finds entities that match given WHERE conditions.
	 */
	static findBy<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		where: FindOptionsWhere<T>,
	): Promise<T[]> {
		return this.getRepository<T>().findBy(where);
	}

	/**
	 * Finds entities that match given find options.
	 * Also counts all entities that match given conditions,
	 * but ignores pagination settings (from and take options).
	 */
	static findAndCount<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		options?: FindManyOptions<T>,
	): Promise<[T[], number]> {
		return this.getRepository<T>().findAndCount(options);
	}

	/**
	 * Finds entities that match given WHERE conditions.
	 * Also counts all entities that match given conditions,
	 * but ignores pagination settings (from and take options).
	 */
	static findAndCountBy<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		where: FindOptionsWhere<T>,
	): Promise<[T[], number]> {
		return this.getRepository<T>().findAndCountBy(where);
	}

	/**
	 * Finds entities by ids.
	 * Optionally find options can be applied.
	 *
	 * @deprecated use `findBy` method instead in conjunction with `In` operator, for example:
	 *
	 * .findBy({
	 *     id: In([1, 2, 3])
	 * })
	 */
	static findByIds<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		ids: any[],
	): Promise<T[]> {
		return this.getRepository<T>().findByIds(ids);
	}

	/**
	 * Finds first entity that matches given conditions.
	 */
	static findOne<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		options: FindOneOptions<T>,
	): Promise<T | null> {
		return this.getRepository<T>().findOne(options);
	}

	/**
	 * Finds first entity that matches given conditions.
	 */
	static findOneBy<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		where: FindOptionsWhere<T>,
	): Promise<T | null> {
		return this.getRepository<T>().findOneBy(where);
	}

	/**
	 * Finds first entity that matches given options.
	 *
	 * @deprecated use `findOneBy` method instead in conjunction with `In` operator, for example:
	 *
	 * .findOneBy({
	 *     id: 1 // where "id" is your primary column name
	 * })
	 */
	static findOneById<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		id: string | number | Date,
	): Promise<T | null> {
		return this.getRepository<T>().findOneById(id);
	}

	/**
	 * Finds first entity that matches given conditions.
	 */
	static findOneOrFail<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		options: FindOneOptions<T>,
	): Promise<T> {
		return this.getRepository<T>().findOneOrFail(options);
	}

	/**
	 * Finds first entity that matches given conditions.
	 */
	static findOneByOrFail<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		where: FindOptionsWhere<T>,
	): Promise<T> {
		return this.getRepository<T>().findOneByOrFail(where);
	}

	/**
	 * Executes a raw SQL query and returns a raw database results.
	 * Raw query execution is supported only by relational databases (MongoDB is not supported).
	 */
	static query<T extends BaseEntity>(
		this: { new (): T } & typeof BaseEntity,
		query: string,
		parameters?: any[],
	): Promise<any> {
		return this.getRepository<T>().query(query, parameters);
	}

	/**
	 * Clears all the data from the given table/collection (truncates/drops it).
	 */
	static clear<T extends BaseEntity>(this: { new (): T } & typeof BaseEntity): Promise<void> {
		return this.getRepository<T>().clear();
	}
}
