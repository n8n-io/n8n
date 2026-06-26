import { DataSource } from '../data-source/DataSource';
import { FindManyOptions } from '../find-options/FindManyOptions';
import { EntityTarget } from '../common/EntityTarget';
import { ObjectType } from '../common/ObjectType';
import { EntityNotFoundError } from '../error/EntityNotFoundError';
import { QueryRunnerProviderAlreadyReleasedError } from '../error/QueryRunnerProviderAlreadyReleasedError';
import { FindOneOptions } from '../find-options/FindOneOptions';
import { DeepPartial } from '../common/DeepPartial';
import { RemoveOptions } from '../repository/RemoveOptions';
import { SaveOptions } from '../repository/SaveOptions';
import { NoNeedToReleaseEntityManagerError } from '../error/NoNeedToReleaseEntityManagerError';
import { TreeRepository } from '../repository/TreeRepository';
import { Repository } from '../repository/Repository';
import { FindOptionsUtils } from '../find-options/FindOptionsUtils';
import { PlainObjectToNewEntityTransformer } from '../query-builder/transformer/PlainObjectToNewEntityTransformer';
import { PlainObjectToDatabaseEntityTransformer } from '../query-builder/transformer/PlainObjectToDatabaseEntityTransformer';
import {
	CustomRepositoryCannotInheritRepositoryError,
	CustomRepositoryNotFoundError,
	TreeRepositoryNotSupportedError,
	TypeORMError,
} from '../error';
import { AbstractRepository } from '../repository/AbstractRepository';
import { QueryRunner } from '../query-runner/QueryRunner';
import { SelectQueryBuilder } from '../query-builder/SelectQueryBuilder';
import { QueryDeepPartialEntity } from '../query-builder/QueryPartialEntity';
import { EntityPersistExecutor } from '../persistence/EntityPersistExecutor';
import { InsertResult } from '../query-builder/result/InsertResult';
import { UpdateResult } from '../query-builder/result/UpdateResult';
import { DeleteResult } from '../query-builder/result/DeleteResult';
import { FindOptionsWhere } from '../find-options/FindOptionsWhere';
import { IsolationLevel } from '../driver/types/IsolationLevel';
import { ObjectUtils } from '../util/ObjectUtils';
import { getMetadataArgsStorage } from '../globals';
import { UpsertOptions } from '../repository/UpsertOptions';
import { InstanceChecker } from '../util/InstanceChecker';
import { ObjectLiteral } from '../common/ObjectLiteral';
import { PickKeysByType } from '../common/PickKeysByType';

/**
 * Entity manager supposed to work with any entity, automatically find its repository and call its methods,
 * whatever entity type are you passing.
 */
export class EntityManager {
	readonly '@instanceof' = Symbol.for('EntityManager');

	// -------------------------------------------------------------------------
	// Public Properties
	// -------------------------------------------------------------------------

	/**
	 * Connection used by this entity manager.
	 */
	readonly connection: DataSource;

	/**
	 * Custom query runner to be used for operations in this entity manager.
	 * Used only in non-global entity manager.
	 */
	readonly queryRunner?: QueryRunner;

	// -------------------------------------------------------------------------
	// Protected Properties
	// -------------------------------------------------------------------------

	/**
	 * Once created and then reused by repositories.
	 * Created as a future replacement for the #repositories to provide a bit more perf optimization.
	 */
	protected repositories = new Map<EntityTarget<any>, Repository<any>>();

	/**
	 * Once created and then reused by repositories.
	 */
	protected treeRepositories: TreeRepository<any>[] = [];

	/**
	 * Plain to object transformer used in create and merge operations.
	 */
	protected plainObjectToEntityTransformer = new PlainObjectToNewEntityTransformer();

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(connection: DataSource, queryRunner?: QueryRunner) {
		this.connection = connection;
		if (queryRunner) {
			this.queryRunner = queryRunner;
			// dynamic: this.queryRunner = manager;
			ObjectUtils.assign(this.queryRunner, { manager: this });
		}
	}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Wraps given function execution (and all operations made there) in a transaction.
	 * All database operations must be executed using provided entity manager.
	 */
	async transaction<T>(runInTransaction: (entityManager: EntityManager) => Promise<T>): Promise<T>;

	/**
	 * Wraps given function execution (and all operations made there) in a transaction.
	 * All database operations must be executed using provided entity manager.
	 */
	async transaction<T>(
		isolationLevel: IsolationLevel,
		runInTransaction: (entityManager: EntityManager) => Promise<T>,
	): Promise<T>;

	/**
	 * Wraps given function execution (and all operations made there) in a transaction.
	 * All database operations must be executed using provided entity manager.
	 */
	async transaction<T>(
		isolationOrRunInTransaction: IsolationLevel | ((entityManager: EntityManager) => Promise<T>),
		runInTransactionParam?: (entityManager: EntityManager) => Promise<T>,
	): Promise<T> {
		const isolation =
			typeof isolationOrRunInTransaction === 'string' ? isolationOrRunInTransaction : undefined;
		const runInTransaction =
			typeof isolationOrRunInTransaction === 'function'
				? isolationOrRunInTransaction
				: runInTransactionParam;

		if (!runInTransaction) {
			throw new TypeORMError(
				`Transaction method requires callback in second parameter if isolation level is supplied.`,
			);
		}

		if (this.queryRunner && this.queryRunner.isReleased)
			throw new QueryRunnerProviderAlreadyReleasedError();

		// if query runner is already defined in this class, it means this entity manager was already created for a single connection
		// if its not defined we create a new query runner - single connection where we'll execute all our operations
		const queryRunner = this.queryRunner || this.connection.createQueryRunner();

		try {
			await queryRunner.startTransaction(isolation);
			const result = await runInTransaction(queryRunner.manager);
			await queryRunner.commitTransaction();
			return result;
		} catch (err) {
			try {
				// we throw original error even if rollback thrown an error
				await queryRunner.rollbackTransaction();
			} catch (rollbackError) {}
			throw err;
		} finally {
			if (!this.queryRunner)
				// if we used a new query runner provider then release it
				await queryRunner.release();
		}
	}

	/**
	 * Executes raw SQL query and returns raw database results.
	 */
	async query<T = any>(query: string, parameters?: any[]): Promise<T> {
		return this.connection.query(query, parameters, this.queryRunner);
	}

	/**
	 * Creates a new query builder that can be used to build a SQL query.
	 */
	createQueryBuilder<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		alias: string,
		queryRunner?: QueryRunner,
	): SelectQueryBuilder<Entity>;

	/**
	 * Creates a new query builder that can be used to build a SQL query.
	 */
	createQueryBuilder(queryRunner?: QueryRunner): SelectQueryBuilder<any>;

	/**
	 * Creates a new query builder that can be used to build a SQL query.
	 */
	createQueryBuilder<Entity extends ObjectLiteral>(
		entityClass?: EntityTarget<Entity> | QueryRunner,
		alias?: string,
		queryRunner?: QueryRunner,
	): SelectQueryBuilder<Entity> {
		if (alias) {
			return this.connection.createQueryBuilder(
				entityClass as EntityTarget<Entity>,
				alias,
				queryRunner || this.queryRunner,
			);
		} else {
			return this.connection.createQueryBuilder(
				(entityClass as QueryRunner | undefined) || queryRunner || this.queryRunner,
			);
		}
	}

	/**
	 * Checks if entity has an id.
	 */
	hasId(entity: any): boolean;

	/**
	 * Checks if entity of given schema name has an id.
	 */
	hasId(target: Function | string, entity: any): boolean;

	/**
	 * Checks if entity has an id by its Function type or schema name.
	 */
	hasId(targetOrEntity: any | Function | string, maybeEntity?: any): boolean {
		const target = arguments.length === 2 ? targetOrEntity : targetOrEntity.constructor;
		const entity = arguments.length === 2 ? maybeEntity : targetOrEntity;
		const metadata = this.connection.getMetadata(target);
		return metadata.hasId(entity);
	}

	/**
	 * Gets entity mixed id.
	 */
	getId(entity: any): any;

	/**
	 * Gets entity mixed id.
	 */
	getId(target: EntityTarget<any>, entity: any): any;

	/**
	 * Gets entity mixed id.
	 */
	getId(targetOrEntity: any | EntityTarget<any>, maybeEntity?: any): any {
		const target = arguments.length === 2 ? targetOrEntity : targetOrEntity.constructor;
		const entity = arguments.length === 2 ? maybeEntity : targetOrEntity;
		const metadata = this.connection.getMetadata(target);
		return metadata.getEntityIdMixedMap(entity);
	}

	/**
	 * Creates a new entity instance and copies all entity properties from this object into a new entity.
	 * Note that it copies only properties that present in entity schema.
	 */
	create<Entity, EntityLike extends DeepPartial<Entity>>(
		entityClass: EntityTarget<Entity>,
		plainObject?: EntityLike,
	): Entity;

	/**
	 * Creates a new entities and copies all entity properties from given objects into their new entities.
	 * Note that it copies only properties that present in entity schema.
	 */
	create<Entity, EntityLike extends DeepPartial<Entity>>(
		entityClass: EntityTarget<Entity>,
		plainObjects?: EntityLike[],
	): Entity[];

	/**
	 * Creates a new entity instance or instances.
	 * Can copy properties from the given object into new entities.
	 */
	create<Entity, EntityLike extends DeepPartial<Entity>>(
		entityClass: EntityTarget<Entity>,
		plainObjectOrObjects?: EntityLike | EntityLike[],
	): Entity | Entity[] {
		const metadata = this.connection.getMetadata(entityClass);

		if (!plainObjectOrObjects) return metadata.create(this.queryRunner);

		if (Array.isArray(plainObjectOrObjects))
			return (plainObjectOrObjects as EntityLike[]).map((plainEntityLike) =>
				this.create(entityClass, plainEntityLike),
			);

		const mergeIntoEntity = metadata.create(this.queryRunner);
		this.plainObjectToEntityTransformer.transform(
			mergeIntoEntity,
			plainObjectOrObjects,
			metadata,
			true,
		);
		return mergeIntoEntity;
	}

	/**
	 * Merges two entities into one new entity.
	 */
	merge<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		mergeIntoEntity: Entity,
		...entityLikes: DeepPartial<Entity>[]
	): Entity {
		// todo: throw exception if entity manager is released
		const metadata = this.connection.getMetadata(entityClass);
		entityLikes.forEach((object) =>
			this.plainObjectToEntityTransformer.transform(mergeIntoEntity, object, metadata),
		);
		return mergeIntoEntity;
	}

	/**
	 * Creates a new entity from the given plain javascript object. If entity already exist in the database, then
	 * it loads it (and everything related to it), replaces all values with the new ones from the given object
	 * and returns this new entity. This new entity is actually a loaded from the db entity with all properties
	 * replaced from the new object.
	 */
	async preload<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		entityLike: DeepPartial<Entity>,
	): Promise<Entity | undefined> {
		const metadata = this.connection.getMetadata(entityClass);
		const plainObjectToDatabaseEntityTransformer = new PlainObjectToDatabaseEntityTransformer(
			this.connection.manager,
		);
		const transformedEntity = await plainObjectToDatabaseEntityTransformer.transform(
			entityLike,
			metadata,
		);
		if (transformedEntity)
			return this.merge(entityClass as any, transformedEntity as Entity, entityLike);

		return undefined;
	}

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
	save<Entity, T extends DeepPartial<Entity>>(
		targetOrEntity: EntityTarget<Entity>,
		entities: T[],
		options: SaveOptions & { reload: false },
	): Promise<T[]>;

	/**
	 * Saves all given entities in the database.
	 * If entities do not exist in the database then inserts, otherwise updates.
	 */
	save<Entity, T extends DeepPartial<Entity>>(
		targetOrEntity: EntityTarget<Entity>,
		entities: T[],
		options?: SaveOptions,
	): Promise<(T & Entity)[]>;

	/**
	 * Saves a given entity in the database.
	 * If entity does not exist in the database then inserts, otherwise updates.
	 */
	save<Entity, T extends DeepPartial<Entity>>(
		targetOrEntity: EntityTarget<Entity>,
		entity: T,
		options: SaveOptions & { reload: false },
	): Promise<T>;

	/**
	 * Saves a given entity in the database.
	 * If entity does not exist in the database then inserts, otherwise updates.
	 */
	save<Entity, T extends DeepPartial<Entity>>(
		targetOrEntity: EntityTarget<Entity>,
		entity: T,
		options?: SaveOptions,
	): Promise<T & Entity>;

	/**
	 * Saves a given entity in the database.
	 */
	save<Entity extends ObjectLiteral, T extends DeepPartial<Entity>>(
		targetOrEntity: (T | T[]) | EntityTarget<Entity>,
		maybeEntityOrOptions?: T | T[],
		maybeOptions?: SaveOptions,
	): Promise<T | T[]> {
		// normalize mixed parameters
		let target =
			arguments.length > 1 &&
			(typeof targetOrEntity === 'function' ||
				InstanceChecker.isEntitySchema(targetOrEntity) ||
				typeof targetOrEntity === 'string')
				? (targetOrEntity as Function | string)
				: undefined;
		const entity: T | T[] = target
			? (maybeEntityOrOptions as T | T[])
			: (targetOrEntity as T | T[]);
		const options = target ? maybeOptions : (maybeEntityOrOptions as SaveOptions);

		if (InstanceChecker.isEntitySchema(target)) target = target.options.name;

		// if user passed empty array of entities then we don't need to do anything
		if (Array.isArray(entity) && entity.length === 0) return Promise.resolve(entity);

		// execute save operation
		return new EntityPersistExecutor(
			this.connection,
			this.queryRunner,
			'save',
			target,
			entity,
			options,
		)
			.execute()
			.then(() => entity);
	}

	/**
	 * Removes a given entity from the database.
	 */
	remove<Entity>(entity: Entity, options?: RemoveOptions): Promise<Entity>;

	/**
	 * Removes a given entity from the database.
	 */
	remove<Entity>(
		targetOrEntity: EntityTarget<Entity>,
		entity: Entity,
		options?: RemoveOptions,
	): Promise<Entity>;

	/**
	 * Removes a given entity from the database.
	 */
	remove<Entity>(entity: Entity[], options?: RemoveOptions): Promise<Entity>;

	/**
	 * Removes a given entity from the database.
	 */
	remove<Entity>(
		targetOrEntity: EntityTarget<Entity>,
		entity: Entity[],
		options?: RemoveOptions,
	): Promise<Entity[]>;

	/**
	 * Removes a given entity from the database.
	 */
	remove<Entity extends ObjectLiteral>(
		targetOrEntity: (Entity | Entity[]) | EntityTarget<Entity>,
		maybeEntityOrOptions?: Entity | Entity[],
		maybeOptions?: RemoveOptions,
	): Promise<Entity | Entity[]> {
		// normalize mixed parameters
		const target =
			arguments.length > 1 &&
			(typeof targetOrEntity === 'function' ||
				InstanceChecker.isEntitySchema(targetOrEntity) ||
				typeof targetOrEntity === 'string')
				? (targetOrEntity as Function | string)
				: undefined;
		const entity: Entity | Entity[] = target
			? (maybeEntityOrOptions as Entity | Entity[])
			: (targetOrEntity as Entity | Entity[]);
		const options = target ? maybeOptions : (maybeEntityOrOptions as SaveOptions);

		// if user passed empty array of entities then we don't need to do anything
		if (Array.isArray(entity) && entity.length === 0) return Promise.resolve(entity);

		// execute save operation
		return new EntityPersistExecutor(
			this.connection,
			this.queryRunner,
			'remove',
			target,
			entity,
			options,
		)
			.execute()
			.then(() => entity);
	}

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
	softRemove<Entity, T extends DeepPartial<Entity>>(
		targetOrEntity: EntityTarget<Entity>,
		entities: T[],
		options?: SaveOptions,
	): Promise<T[]>;

	/**
	 * Records the delete date of a given entity.
	 */
	softRemove<Entity, T extends DeepPartial<Entity>>(
		targetOrEntity: EntityTarget<Entity>,
		entity: T,
		options?: SaveOptions,
	): Promise<T>;

	/**
	 * Records the delete date of one or many given entities.
	 */
	softRemove<Entity extends ObjectLiteral, T extends DeepPartial<Entity>>(
		targetOrEntity: (T | T[]) | EntityTarget<Entity>,
		maybeEntityOrOptions?: T | T[],
		maybeOptions?: SaveOptions,
	): Promise<T | T[]> {
		// normalize mixed parameters
		let target =
			arguments.length > 1 &&
			(typeof targetOrEntity === 'function' ||
				InstanceChecker.isEntitySchema(targetOrEntity) ||
				typeof targetOrEntity === 'string')
				? (targetOrEntity as Function | string)
				: undefined;
		const entity: T | T[] = target
			? (maybeEntityOrOptions as T | T[])
			: (targetOrEntity as T | T[]);
		const options = target ? maybeOptions : (maybeEntityOrOptions as SaveOptions);

		if (InstanceChecker.isEntitySchema(target)) target = target.options.name;

		// if user passed empty array of entities then we don't need to do anything
		if (Array.isArray(entity) && entity.length === 0) return Promise.resolve(entity);

		// execute soft-remove operation
		return new EntityPersistExecutor(
			this.connection,
			this.queryRunner,
			'soft-remove',
			target,
			entity,
			options,
		)
			.execute()
			.then(() => entity);
	}

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
	recover<Entity, T extends DeepPartial<Entity>>(
		targetOrEntity: EntityTarget<Entity>,
		entities: T[],
		options?: SaveOptions,
	): Promise<T[]>;

	/**
	 * Recovers a given entity.
	 */
	recover<Entity, T extends DeepPartial<Entity>>(
		targetOrEntity: EntityTarget<Entity>,
		entity: T,
		options?: SaveOptions,
	): Promise<T>;

	/**
	 * Recovers one or many given entities.
	 */
	recover<Entity extends ObjectLiteral, T extends DeepPartial<Entity>>(
		targetOrEntity: (T | T[]) | EntityTarget<Entity>,
		maybeEntityOrOptions?: T | T[],
		maybeOptions?: SaveOptions,
	): Promise<T | T[]> {
		// normalize mixed parameters
		let target =
			arguments.length > 1 &&
			(typeof targetOrEntity === 'function' ||
				InstanceChecker.isEntitySchema(targetOrEntity) ||
				typeof targetOrEntity === 'string')
				? (targetOrEntity as Function | string)
				: undefined;
		const entity: T | T[] = target
			? (maybeEntityOrOptions as T | T[])
			: (targetOrEntity as T | T[]);
		const options = target ? maybeOptions : (maybeEntityOrOptions as SaveOptions);

		if (InstanceChecker.isEntitySchema(target)) target = target.options.name;

		// if user passed empty array of entities then we don't need to do anything
		if (Array.isArray(entity) && entity.length === 0) return Promise.resolve(entity);

		// execute recover operation
		return new EntityPersistExecutor(
			this.connection,
			this.queryRunner,
			'recover',
			target,
			entity,
			options,
		)
			.execute()
			.then(() => entity);
	}

	/**
	 * Inserts a given entity into the database.
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient INSERT query.
	 * Does not check if entity exist in the database, so query will fail if duplicate entity is being inserted.
	 * You can execute bulk inserts using this method.
	 */
	async insert<Entity extends ObjectLiteral>(
		target: EntityTarget<Entity>,
		entity: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[],
	): Promise<InsertResult> {
		return this.createQueryBuilder().insert().into(target).values(entity).execute();
	}

	async upsert<Entity extends ObjectLiteral>(
		target: EntityTarget<Entity>,
		entityOrEntities: QueryDeepPartialEntity<Entity> | QueryDeepPartialEntity<Entity>[],
		conflictPathsOrOptions: string[] | UpsertOptions<Entity>,
	): Promise<InsertResult> {
		const metadata = this.connection.getMetadata(target);

		let options: UpsertOptions<Entity>;

		if (Array.isArray(conflictPathsOrOptions)) {
			options = {
				conflictPaths: conflictPathsOrOptions,
			};
		} else {
			options = conflictPathsOrOptions;
		}

		let entities: QueryDeepPartialEntity<Entity>[];

		if (!Array.isArray(entityOrEntities)) {
			entities = [entityOrEntities];
		} else {
			entities = entityOrEntities;
		}

		const conflictColumns = metadata.mapPropertyPathsToColumns(
			Array.isArray(options.conflictPaths)
				? options.conflictPaths
				: Object.keys(options.conflictPaths),
		);

		const overwriteColumns = metadata.columns.filter(
			(col) =>
				!conflictColumns.includes(col) &&
				entities.some((entity) => typeof col.getEntityValue(entity) !== 'undefined'),
		);

		return this.createQueryBuilder()
			.insert()
			.into(target)
			.values(entities)
			.orUpdate(
				[...conflictColumns, ...overwriteColumns].map((col) => col.databaseName),
				conflictColumns.map((col) => col.databaseName),
				{
					skipUpdateIfNoValuesChanged: options.skipUpdateIfNoValuesChanged,
					indexPredicate: options.indexPredicate,
					upsertType: options.upsertType || this.connection.driver.supportedUpsertTypes[0],
				},
			)
			.execute();
	}

	/**
	 * Updates entity partially. Entity can be found by a given condition(s).
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient UPDATE query.
	 * Does not check if entity exist in the database.
	 * Condition(s) cannot be empty.
	 */
	update<Entity extends ObjectLiteral>(
		target: EntityTarget<Entity>,
		criteria: string | string[] | number | number[] | Date | Date[] | any,
		partialEntity: QueryDeepPartialEntity<Entity>,
	): Promise<UpdateResult> {
		// if user passed empty criteria or empty list of criterias, then throw an error
		if (
			criteria === undefined ||
			criteria === null ||
			criteria === '' ||
			(Array.isArray(criteria) && criteria.length === 0)
		) {
			return Promise.reject(
				new TypeORMError(`Empty criteria(s) are not allowed for the update method.`),
			);
		}

		if (
			typeof criteria === 'string' ||
			typeof criteria === 'number' ||
			criteria instanceof Date ||
			Array.isArray(criteria)
		) {
			return this.createQueryBuilder()
				.update(target)
				.set(partialEntity)
				.whereInIds(criteria)
				.execute();
		} else {
			return this.createQueryBuilder().update(target).set(partialEntity).where(criteria).execute();
		}
	}

	/**
	 * Deletes entities by a given condition(s).
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient DELETE query.
	 * Does not check if entity exist in the database.
	 * Condition(s) cannot be empty.
	 */
	delete<Entity extends ObjectLiteral>(
		targetOrEntity: EntityTarget<Entity>,
		criteria: string | string[] | number | number[] | Date | Date[] | any,
	): Promise<DeleteResult> {
		// if user passed empty criteria or empty list of criterias, then throw an error
		if (
			criteria === undefined ||
			criteria === null ||
			criteria === '' ||
			(Array.isArray(criteria) && criteria.length === 0)
		) {
			return Promise.reject(
				new TypeORMError(`Empty criteria(s) are not allowed for the delete method.`),
			);
		}

		if (
			typeof criteria === 'string' ||
			typeof criteria === 'number' ||
			criteria instanceof Date ||
			Array.isArray(criteria)
		) {
			return this.createQueryBuilder().delete().from(targetOrEntity).whereInIds(criteria).execute();
		} else {
			return this.createQueryBuilder().delete().from(targetOrEntity).where(criteria).execute();
		}
	}

	/**
	 * Records the delete date of entities by a given condition(s).
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient DELETE query.
	 * Does not check if entity exist in the database.
	 * Condition(s) cannot be empty.
	 */
	softDelete<Entity extends ObjectLiteral>(
		targetOrEntity: EntityTarget<Entity>,
		criteria: string | string[] | number | number[] | Date | Date[] | any,
	): Promise<UpdateResult> {
		// if user passed empty criteria or empty list of criterias, then throw an error
		if (
			criteria === undefined ||
			criteria === null ||
			criteria === '' ||
			(Array.isArray(criteria) && criteria.length === 0)
		) {
			return Promise.reject(
				new TypeORMError(`Empty criteria(s) are not allowed for the delete method.`),
			);
		}

		if (
			typeof criteria === 'string' ||
			typeof criteria === 'number' ||
			criteria instanceof Date ||
			Array.isArray(criteria)
		) {
			return this.createQueryBuilder()
				.softDelete()
				.from(targetOrEntity)
				.whereInIds(criteria)
				.execute();
		} else {
			return this.createQueryBuilder().softDelete().from(targetOrEntity).where(criteria).execute();
		}
	}

	/**
	 * Restores entities by a given condition(s).
	 * Unlike save method executes a primitive operation without cascades, relations and other operations included.
	 * Executes fast and efficient DELETE query.
	 * Does not check if entity exist in the database.
	 * Condition(s) cannot be empty.
	 */
	restore<Entity extends ObjectLiteral>(
		targetOrEntity: EntityTarget<Entity>,
		criteria: string | string[] | number | number[] | Date | Date[] | any,
	): Promise<UpdateResult> {
		// if user passed empty criteria or empty list of criterias, then throw an error
		if (
			criteria === undefined ||
			criteria === null ||
			criteria === '' ||
			(Array.isArray(criteria) && criteria.length === 0)
		) {
			return Promise.reject(
				new TypeORMError(`Empty criteria(s) are not allowed for the delete method.`),
			);
		}

		if (
			typeof criteria === 'string' ||
			typeof criteria === 'number' ||
			criteria instanceof Date ||
			Array.isArray(criteria)
		) {
			return this.createQueryBuilder()
				.restore()
				.from(targetOrEntity)
				.whereInIds(criteria)
				.execute();
		} else {
			return this.createQueryBuilder().restore().from(targetOrEntity).where(criteria).execute();
		}
	}

	/**
	 * Checks whether any entity exists with the given options.
	 */
	exists<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		options?: FindManyOptions<Entity>,
	): Promise<boolean> {
		const metadata = this.connection.getMetadata(entityClass);
		return this.createQueryBuilder(
			entityClass,
			FindOptionsUtils.extractFindManyOptionsAlias(options) || metadata.name,
		)
			.setFindOptions(options || {})
			.getExists();
	}

	/**
	 * Checks whether any entity exists with the given conditions.
	 */
	async existsBy<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<boolean> {
		const metadata = this.connection.getMetadata(entityClass);
		return this.createQueryBuilder(entityClass, metadata.name)
			.setFindOptions({ where })
			.getExists();
	}

	/**
	 * Counts entities that match given options.
	 * Useful for pagination.
	 */
	count<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		options?: FindManyOptions<Entity>,
	): Promise<number> {
		const metadata = this.connection.getMetadata(entityClass);
		return this.createQueryBuilder(
			entityClass,
			FindOptionsUtils.extractFindManyOptionsAlias(options) || metadata.name,
		)
			.setFindOptions(options || {})
			.getCount();
	}

	/**
	 * Counts entities that match given conditions.
	 * Useful for pagination.
	 */
	countBy<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<number> {
		const metadata = this.connection.getMetadata(entityClass);
		return this.createQueryBuilder(entityClass, metadata.name).setFindOptions({ where }).getCount();
	}

	/**
	 * Return the SUM of a column
	 */
	sum<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		columnName: PickKeysByType<Entity, number>,
		where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<number | null> {
		return this.callAggregateFun(entityClass, 'SUM', columnName, where);
	}

	/**
	 * Return the AVG of a column
	 */
	average<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		columnName: PickKeysByType<Entity, number>,
		where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<number | null> {
		return this.callAggregateFun(entityClass, 'AVG', columnName, where);
	}

	/**
	 * Return the MIN of a column
	 */
	minimum<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		columnName: PickKeysByType<Entity, number>,
		where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<number | null> {
		return this.callAggregateFun(entityClass, 'MIN', columnName, where);
	}

	/**
	 * Return the MAX of a column
	 */
	maximum<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		columnName: PickKeysByType<Entity, number>,
		where?: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<number | null> {
		return this.callAggregateFun(entityClass, 'MAX', columnName, where);
	}

	private async callAggregateFun<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		fnName: 'SUM' | 'AVG' | 'MIN' | 'MAX',
		columnName: PickKeysByType<Entity, number>,
		where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[] = {},
	): Promise<number | null> {
		const metadata = this.connection.getMetadata(entityClass);
		const column = metadata.columns.find((item) => item.propertyPath === columnName);
		if (!column) {
			throw new TypeORMError(`Column "${columnName}" was not found in table "${metadata.name}"`);
		}

		const result = await this.createQueryBuilder(entityClass, metadata.name)
			.setFindOptions({ where })
			.select(`${fnName}(${this.connection.driver.escape(column.databaseName)})`, fnName)
			.getRawOne();
		return result[fnName] === null ? null : parseFloat(result[fnName]);
	}

	/**
	 * Finds entities that match given find options.
	 */
	async find<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		options?: FindManyOptions<Entity>,
	): Promise<Entity[]> {
		const metadata = this.connection.getMetadata(entityClass);
		return this.createQueryBuilder<Entity>(
			entityClass as any,
			FindOptionsUtils.extractFindManyOptionsAlias(options) || metadata.name,
		)
			.setFindOptions(options || {})
			.getMany();
	}

	/**
	 * Finds entities that match given find options.
	 */
	async findBy<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<Entity[]> {
		const metadata = this.connection.getMetadata(entityClass);
		return this.createQueryBuilder<Entity>(entityClass as any, metadata.name)
			.setFindOptions({ where: where })
			.getMany();
	}

	/**
	 * Finds entities that match given find options.
	 * Also counts all entities that match given conditions,
	 * but ignores pagination settings (from and take options).
	 */
	findAndCount<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		options?: FindManyOptions<Entity>,
	): Promise<[Entity[], number]> {
		const metadata = this.connection.getMetadata(entityClass);
		return this.createQueryBuilder<Entity>(
			entityClass as any,
			FindOptionsUtils.extractFindManyOptionsAlias(options) || metadata.name,
		)
			.setFindOptions(options || {})
			.getManyAndCount();
	}

	/**
	 * Finds entities that match given WHERE conditions.
	 * Also counts all entities that match given conditions,
	 * but ignores pagination settings (from and take options).
	 */
	findAndCountBy<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<[Entity[], number]> {
		const metadata = this.connection.getMetadata(entityClass);
		return this.createQueryBuilder<Entity>(entityClass as any, metadata.name)
			.setFindOptions({ where })
			.getManyAndCount();
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
	async findByIds<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		ids: any[],
	): Promise<Entity[]> {
		// if no ids passed, no need to execute a query - just return an empty array of values
		if (!ids.length) return Promise.resolve([]);

		const metadata = this.connection.getMetadata(entityClass);
		return this.createQueryBuilder<Entity>(entityClass as any, metadata.name)
			.andWhereInIds(ids)
			.getMany();
	}

	/**
	 * Finds first entity by a given find options.
	 * If entity was not found in the database - returns null.
	 */
	async findOne<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		options: FindOneOptions<Entity>,
	): Promise<Entity | null> {
		const metadata = this.connection.getMetadata(entityClass);

		// prepare alias for built query
		let alias: string = metadata.name;
		if (options && options.join) {
			alias = options.join.alias;
		}

		if (!options.where) {
			throw new Error(`You must provide selection conditions in order to find a single row.`);
		}

		// create query builder and apply find options
		return this.createQueryBuilder<Entity>(entityClass, alias)
			.setFindOptions({
				...options,
				take: 1,
			})
			.getOne();
	}

	/**
	 * Finds first entity that matches given where condition.
	 * If entity was not found in the database - returns null.
	 */
	async findOneBy<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<Entity | null> {
		const metadata = this.connection.getMetadata(entityClass);

		// create query builder and apply find options
		return this.createQueryBuilder<Entity>(entityClass, metadata.name)
			.setFindOptions({
				where,
				take: 1,
			})
			.getOne();
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
	async findOneById<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		id: number | string | Date,
	): Promise<Entity | null> {
		const metadata = this.connection.getMetadata(entityClass);

		// create query builder and apply find options
		return this.createQueryBuilder<Entity>(entityClass, metadata.name)
			.setFindOptions({
				take: 1,
			})
			.whereInIds(metadata.ensureEntityIdMap(id))
			.getOne();
	}

	/**
	 * Finds first entity by a given find options.
	 * If entity was not found in the database - rejects with error.
	 */
	async findOneOrFail<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		options: FindOneOptions<Entity>,
	): Promise<Entity> {
		return this.findOne<Entity>(entityClass as any, options).then((value) => {
			if (value === null) {
				return Promise.reject(new EntityNotFoundError(entityClass, options));
			}
			return Promise.resolve(value);
		});
	}

	/**
	 * Finds first entity that matches given where condition.
	 * If entity was not found in the database - rejects with error.
	 */
	async findOneByOrFail<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		where: FindOptionsWhere<Entity> | FindOptionsWhere<Entity>[],
	): Promise<Entity> {
		return this.findOneBy<Entity>(entityClass as any, where).then((value) => {
			if (value === null) {
				return Promise.reject(new EntityNotFoundError(entityClass, where));
			}
			return Promise.resolve(value);
		});
	}

	/**
	 * Clears all the data from the given table (truncates/drops it).
	 *
	 * Note: this method uses TRUNCATE and may not work as you expect in transactions on some platforms.
	 * @see https://stackoverflow.com/a/5972738/925151
	 */
	async clear<Entity>(entityClass: EntityTarget<Entity>): Promise<void> {
		const metadata = this.connection.getMetadata(entityClass);
		const queryRunner = this.queryRunner || this.connection.createQueryRunner();
		try {
			return await queryRunner.clearTable(metadata.tablePath); // await is needed here because we are using finally
		} finally {
			if (!this.queryRunner) await queryRunner.release();
		}
	}

	/**
	 * Increments some column by provided value of the entities matched given conditions.
	 */
	async increment<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		conditions: any,
		propertyPath: string,
		value: number | string,
	): Promise<UpdateResult> {
		const metadata = this.connection.getMetadata(entityClass);
		const column = metadata.findColumnWithPropertyPath(propertyPath);
		if (!column)
			throw new TypeORMError(
				`Column ${propertyPath} was not found in ${metadata.targetName} entity.`,
			);

		if (isNaN(Number(value))) throw new TypeORMError(`Value "${value}" is not a number.`);

		// convert possible embeded path "social.likes" into object { social: { like: () => value } }
		const values: QueryDeepPartialEntity<Entity> = propertyPath.split('.').reduceRight(
			(value, key) => ({ [key]: value }) as any,
			() => this.connection.driver.escape(column.databaseName) + ' + ' + value,
		);

		return this.createQueryBuilder<Entity>(entityClass as any, 'entity')
			.update(entityClass)
			.set(values)
			.where(conditions)
			.execute();
	}

	/**
	 * Decrements some column by provided value of the entities matched given conditions.
	 */
	async decrement<Entity extends ObjectLiteral>(
		entityClass: EntityTarget<Entity>,
		conditions: any,
		propertyPath: string,
		value: number | string,
	): Promise<UpdateResult> {
		const metadata = this.connection.getMetadata(entityClass);
		const column = metadata.findColumnWithPropertyPath(propertyPath);
		if (!column)
			throw new TypeORMError(
				`Column ${propertyPath} was not found in ${metadata.targetName} entity.`,
			);

		if (isNaN(Number(value))) throw new TypeORMError(`Value "${value}" is not a number.`);

		// convert possible embeded path "social.likes" into object { social: { like: () => value } }
		const values: QueryDeepPartialEntity<Entity> = propertyPath.split('.').reduceRight(
			(value, key) => ({ [key]: value }) as any,
			() => this.connection.driver.escape(column.databaseName) + ' - ' + value,
		);

		return this.createQueryBuilder<Entity>(entityClass as any, 'entity')
			.update(entityClass)
			.set(values)
			.where(conditions)
			.execute();
	}

	/**
	 * Gets repository for the given entity class or name.
	 * If single database connection mode is used, then repository is obtained from the
	 * repository aggregator, where each repository is individually created for this entity manager.
	 * When single database connection is not used, repository is being obtained from the connection.
	 */
	getRepository<Entity extends ObjectLiteral>(target: EntityTarget<Entity>): Repository<Entity> {
		// find already created repository instance and return it if found
		const repoFromMap = this.repositories.get(target);
		if (repoFromMap) return repoFromMap;

		// if repository was not found then create it, store its instance and return it
		const newRepository = new Repository<any>(target, this, this.queryRunner);
		this.repositories.set(target, newRepository);
		return newRepository;
	}

	/**
	 * Gets tree repository for the given entity class or name.
	 * If single database connection mode is used, then repository is obtained from the
	 * repository aggregator, where each repository is individually created for this entity manager.
	 * When single database connection is not used, repository is being obtained from the connection.
	 */
	getTreeRepository<Entity extends ObjectLiteral>(
		target: EntityTarget<Entity>,
	): TreeRepository<Entity> {
		// tree tables aren't supported by some drivers (mongodb)
		if (this.connection.driver.treeSupport === false)
			throw new TreeRepositoryNotSupportedError(this.connection.driver);

		// find already created repository instance and return it if found
		const repository = this.treeRepositories.find((repository) => repository.target === target);
		if (repository) return repository;

		// check if repository is real tree repository
		const newRepository = new TreeRepository(target, this, this.queryRunner);
		this.treeRepositories.push(newRepository);
		return newRepository;
	}

	/**
	 * Creates a new repository instance out of a given Repository and
	 * sets current EntityManager instance to it. Used to work with custom repositories
	 * in transactions.
	 */
	withRepository<Entity extends ObjectLiteral, R extends Repository<any>>(
		repository: R & Repository<Entity>,
	): R {
		const repositoryConstructor = repository.constructor as typeof Repository;
		const { target, manager, queryRunner, ...otherRepositoryProperties } = repository;
		return Object.assign(new repositoryConstructor(repository.target, this) as R, {
			...otherRepositoryProperties,
		});
	}

	/**
	 * Gets custom entity repository marked with @EntityRepository decorator.
	 *
	 * @deprecated use Repository.extend to create custom repositories
	 */
	getCustomRepository<T>(customRepository: ObjectType<T>): T {
		const entityRepositoryMetadataArgs = getMetadataArgsStorage().entityRepositories.find(
			(repository) => {
				return (
					repository.target ===
					(typeof customRepository === 'function'
						? customRepository
						: (customRepository as any).constructor)
				);
			},
		);
		if (!entityRepositoryMetadataArgs) throw new CustomRepositoryNotFoundError(customRepository);

		const entityMetadata = entityRepositoryMetadataArgs.entity
			? this.connection.getMetadata(entityRepositoryMetadataArgs.entity)
			: undefined;
		const entityRepositoryInstance = new (entityRepositoryMetadataArgs.target as any)(
			this,
			entityMetadata,
		);

		// NOTE: dynamic access to protected properties. We need this to prevent unwanted properties in those classes to be exposed,
		// however we need these properties for internal work of the class
		if (entityRepositoryInstance instanceof AbstractRepository) {
			if (!(entityRepositoryInstance as any)['manager'])
				(entityRepositoryInstance as any)['manager'] = this;
		} else {
			if (!entityMetadata) throw new CustomRepositoryCannotInheritRepositoryError(customRepository);
			(entityRepositoryInstance as any)['manager'] = this;
			(entityRepositoryInstance as any)['metadata'] = entityMetadata;
		}

		return entityRepositoryInstance;
	}

	/**
	 * Releases all resources used by entity manager.
	 * This is used when entity manager is created with a single query runner,
	 * and this single query runner needs to be released after job with entity manager is done.
	 */
	async release(): Promise<void> {
		if (!this.queryRunner) throw new NoNeedToReleaseEntityManagerError();

		return this.queryRunner.release();
	}
}
