import { QueryBuilder } from './QueryBuilder';
import { RelationUpdater } from './RelationUpdater';
import { RelationRemover } from './RelationRemover';
import { TypeORMError } from '../error';
import { ObjectUtils } from '../util/ObjectUtils';
import { ObjectLiteral } from '../common/ObjectLiteral';

/**
 * Allows to work with entity relations and perform specific operations with those relations.
 *
 * todo: add transactions everywhere
 */
export class RelationQueryBuilder<Entity extends ObjectLiteral> extends QueryBuilder<Entity> {
	readonly '@instanceof' = Symbol.for('RelationQueryBuilder');

	// -------------------------------------------------------------------------
	// Public Implemented Methods
	// -------------------------------------------------------------------------

	/**
	 * Gets generated SQL query without parameters being replaced.
	 */
	getQuery(): string {
		return '';
	}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Sets entity (target) which relations will be updated.
	 */
	of(entity: any | any[]): this {
		this.expressionMap.of = entity;
		return this;
	}

	/**
	 * Sets entity relation's value.
	 * Value can be entity, entity id or entity id map (if entity has composite ids).
	 * Works only for many-to-one and one-to-one relations.
	 * For many-to-many and one-to-many relations use #add and #remove methods instead.
	 */
	async set(value: any): Promise<void> {
		const relation = this.expressionMap.relationMetadata;

		if (!this.expressionMap.of)
			// todo: move this check before relation query builder creation?
			throw new TypeORMError(
				`Entity whose relation needs to be set is not set. Use .of method to define whose relation you want to set.`,
			);

		if (relation.isManyToMany || relation.isOneToMany)
			throw new TypeORMError(
				`Set operation is only supported for many-to-one and one-to-one relations. ` +
					`However given "${relation.propertyPath}" has ${relation.relationType} relation. ` +
					`Use .add() method instead.`,
			);

		// if there are multiple join columns then user must send id map as "value" argument. check if he really did it
		if (
			relation.joinColumns &&
			relation.joinColumns.length > 1 &&
			(!ObjectUtils.isObject(value) || Object.keys(value).length < relation.joinColumns.length)
		)
			throw new TypeORMError(
				`Value to be set into the relation must be a map of relation ids, for example: .set({ firstName: "...", lastName: "..." })`,
			);

		const updater = new RelationUpdater(this, this.expressionMap);
		return updater.update(value);
	}

	/**
	 * Adds (binds) given value to entity relation.
	 * Value can be entity, entity id or entity id map (if entity has composite ids).
	 * Value also can be array of entities, array of entity ids or array of entity id maps (if entity has composite ids).
	 * Works only for many-to-many and one-to-many relations.
	 * For many-to-one and one-to-one use #set method instead.
	 */
	async add(value: any | any[]): Promise<void> {
		if (Array.isArray(value) && value.length === 0) return;

		const relation = this.expressionMap.relationMetadata;

		if (!this.expressionMap.of)
			// todo: move this check before relation query builder creation?
			throw new TypeORMError(
				`Entity whose relation needs to be set is not set. Use .of method to define whose relation you want to set.`,
			);

		if (relation.isManyToOne || relation.isOneToOne)
			throw new TypeORMError(
				`Add operation is only supported for many-to-many and one-to-many relations. ` +
					`However given "${relation.propertyPath}" has ${relation.relationType} relation. ` +
					`Use .set() method instead.`,
			);

		// if there are multiple join columns then user must send id map as "value" argument. check if he really did it
		if (
			relation.joinColumns &&
			relation.joinColumns.length > 1 &&
			(!ObjectUtils.isObject(value) || Object.keys(value).length < relation.joinColumns.length)
		)
			throw new TypeORMError(
				`Value to be set into the relation must be a map of relation ids, for example: .set({ firstName: "...", lastName: "..." })`,
			);

		const updater = new RelationUpdater(this, this.expressionMap);
		return updater.update(value);
	}

	/**
	 * Removes (unbinds) given value from entity relation.
	 * Value can be entity, entity id or entity id map (if entity has composite ids).
	 * Value also can be array of entities, array of entity ids or array of entity id maps (if entity has composite ids).
	 * Works only for many-to-many and one-to-many relations.
	 * For many-to-one and one-to-one use #set method instead.
	 */
	async remove(value: any | any[]): Promise<void> {
		if (Array.isArray(value) && value.length === 0) return;

		const relation = this.expressionMap.relationMetadata;

		if (!this.expressionMap.of)
			// todo: move this check before relation query builder creation?
			throw new TypeORMError(
				`Entity whose relation needs to be set is not set. Use .of method to define whose relation you want to set.`,
			);

		if (relation.isManyToOne || relation.isOneToOne)
			throw new TypeORMError(
				`Add operation is only supported for many-to-many and one-to-many relations. ` +
					`However given "${relation.propertyPath}" has ${relation.relationType} relation. ` +
					`Use .set(null) method instead.`,
			);

		const remover = new RelationRemover(this, this.expressionMap);
		return remover.remove(value);
	}

	/**
	 * Adds (binds) and removes (unbinds) given values to/from entity relation.
	 * Value can be entity, entity id or entity id map (if entity has composite ids).
	 * Value also can be array of entities, array of entity ids or array of entity id maps (if entity has composite ids).
	 * Works only for many-to-many and one-to-many relations.
	 * For many-to-one and one-to-one use #set method instead.
	 */
	async addAndRemove(added: any | any[], removed: any | any[]): Promise<void> {
		await this.remove(removed);
		await this.add(added);
	}

	/**
     * Gets entity's relation id.
    async getId(): Promise<any> {

    }*/

	/**
     * Gets entity's relation ids.
    async getIds(): Promise<any[]> {
        return [];
    }*/

	/**
	 * Loads a single entity (relational) from the relation.
	 * You can also provide id of relational entity to filter by.
	 */
	async loadOne<T = any>(): Promise<T | undefined> {
		return this.loadMany<T>().then((results) => results[0]);
	}

	/**
	 * Loads many entities (relational) from the relation.
	 * You can also provide ids of relational entities to filter by.
	 */
	async loadMany<T = any>(): Promise<T[]> {
		let of = this.expressionMap.of;
		if (!ObjectUtils.isObject(of)) {
			const metadata = this.expressionMap.mainAlias!.metadata;
			if (metadata.hasMultiplePrimaryKeys)
				throw new TypeORMError(
					`Cannot load entity because only one primary key was specified, however entity contains multiple primary keys`,
				);

			of = metadata.primaryColumns[0].createValueMap(of);
		}

		return this.connection.relationLoader.load(
			this.expressionMap.relationMetadata,
			of,
			this.queryRunner,
		);
	}
}
