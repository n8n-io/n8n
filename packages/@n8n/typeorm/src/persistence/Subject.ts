import { ObjectLiteral } from '../common/ObjectLiteral';
import { EntityMetadata } from '../metadata/EntityMetadata';
import { SubjectChangeMap } from './SubjectChangeMap';
import { OrmUtils } from '../util/OrmUtils';
import { RelationMetadata } from '../metadata/RelationMetadata';
import { ColumnMetadata } from '../metadata/ColumnMetadata';
import { ObjectUtils } from '../util/ObjectUtils';
import { InstanceChecker } from '../util/InstanceChecker';

/**
 * Subject is a subject of persistence.
 * It holds information about each entity that needs to be persisted:
 * - what entity should be persisted
 * - what is database representation of the persisted entity
 * - what entity metadata of the persisted entity
 * - what is allowed to with persisted entity (insert/update/remove)
 *
 * Having this collection of subjects we can perform database queries.
 */
export class Subject {
	readonly '@instanceof' = Symbol.for('Subject');

	// -------------------------------------------------------------------------
	// Properties
	// -------------------------------------------------------------------------

	/**
	 * Entity metadata of the subject entity.
	 */
	metadata: EntityMetadata;

	/**
	 * Subject identifier.
	 * This identifier is not limited to table entity primary columns.
	 * This can be entity id or ids as well as some unique entity properties, like name or title.
	 * Insert / Update / Remove operation will be executed by a given identifier.
	 */
	identifier: ObjectLiteral | undefined = undefined;

	/**
	 * Copy of entity but with relational ids fulfilled.
	 */
	entityWithFulfilledIds: ObjectLiteral | undefined = undefined;

	/**
	 * If subject was created by cascades this property will contain subject
	 * from where this subject was created.
	 */
	parentSubject?: Subject;

	/**
	 * Gets entity sent to the persistence (e.g. changed entity).
	 * If entity is not set then this subject is created only for the entity loaded from the database,
	 * or this subject is used for the junction operation (junction operations are relying only on identifier).
	 */
	entity?: ObjectLiteral;

	/**
	 * Database entity.
	 * THIS IS NOT RAW ENTITY DATA, its a real entity.
	 */
	databaseEntity?: ObjectLiteral;

	/**
	 * Indicates if database entity was loaded.
	 * No matter if it was found or not, it indicates the fact of loading.
	 */
	databaseEntityLoaded: boolean = false;

	/**
	 * Changes needs to be applied in the database for the given subject.
	 */
	changeMaps: SubjectChangeMap[] = [];

	/**
	 * Generated values returned by a database (for example generated id or default values).
	 * Used in insert and update operations.
	 * Has entity-like structure (not just column database name and values).
	 */
	generatedMap?: ObjectLiteral;

	/**
	 * Inserted values with updated values of special and default columns.
	 * Has entity-like structure (not just column database name and values).
	 */
	insertedValueSet?: ObjectLiteral;

	/**
	 * Indicates if this subject can be inserted into the database.
	 * This means that this subject either is newly persisted, either can be inserted by cascades.
	 */
	canBeInserted: boolean = false;

	/**
	 * Indicates if this subject can be updated in the database.
	 * This means that this subject either was persisted, either can be updated by cascades.
	 */
	canBeUpdated: boolean = false;

	/**
	 * Indicates if this subject MUST be removed from the database.
	 * This means that this subject either was removed, either was removed by cascades.
	 */
	mustBeRemoved: boolean = false;

	/**
	 * Indicates if this subject can be soft-removed from the database.
	 * This means that this subject either was soft-removed, either was soft-removed by cascades.
	 */
	canBeSoftRemoved: boolean = false;

	/**
	 * Indicates if this subject can be recovered from the database.
	 * This means that this subject either was recovered, either was recovered by cascades.
	 */
	canBeRecovered: boolean = false;

	/**
	 * Relations updated by the change maps.
	 */
	updatedRelationMaps: {
		relation: RelationMetadata;
		value: ObjectLiteral;
	}[] = [];

	/**
	 * List of updated columns
	 */
	diffColumns: ColumnMetadata[] = [];

	/**
	 * List of updated relations
	 */
	diffRelations: RelationMetadata[] = [];

	// -------------------------------------------------------------------------
	// Constructor
	// -------------------------------------------------------------------------

	constructor(options: {
		metadata: EntityMetadata;
		parentSubject?: Subject;
		entity?: ObjectLiteral;
		canBeInserted?: boolean;
		canBeUpdated?: boolean;
		mustBeRemoved?: boolean;
		canBeSoftRemoved?: boolean;
		canBeRecovered?: boolean;
		identifier?: ObjectLiteral;
		changeMaps?: SubjectChangeMap[];
	}) {
		this.metadata = options.metadata;
		this.entity = options.entity;
		this.parentSubject = options.parentSubject;
		if (options.canBeInserted !== undefined) this.canBeInserted = options.canBeInserted;
		if (options.canBeUpdated !== undefined) this.canBeUpdated = options.canBeUpdated;
		if (options.mustBeRemoved !== undefined) this.mustBeRemoved = options.mustBeRemoved;
		if (options.canBeSoftRemoved !== undefined) this.canBeSoftRemoved = options.canBeSoftRemoved;
		if (options.canBeRecovered !== undefined) this.canBeRecovered = options.canBeRecovered;
		if (options.identifier !== undefined) this.identifier = options.identifier;
		if (options.changeMaps !== undefined) this.changeMaps.push(...options.changeMaps);

		this.recompute();
	}

	// -------------------------------------------------------------------------
	// Accessors
	// -------------------------------------------------------------------------

	/**
	 * Checks if this subject must be inserted into the database.
	 * Subject can be inserted into the database if it is allowed to be inserted (explicitly persisted or by cascades)
	 * and if it does not have database entity set.
	 */
	get mustBeInserted() {
		return this.canBeInserted && !this.databaseEntity;
	}

	/**
	 * Checks if this subject must be updated into the database.
	 * Subject can be updated in the database if it is allowed to be updated (explicitly persisted or by cascades)
	 * and if it does have differentiated columns or relations.
	 */
	get mustBeUpdated() {
		return (
			this.canBeUpdated &&
			this.identifier &&
			(this.databaseEntityLoaded === false || (this.databaseEntityLoaded && this.databaseEntity)) &&
			// ((this.entity && this.databaseEntity) || (!this.entity && !this.databaseEntity)) &&
			// ensure there are one or more changes for updatable columns
			this.changeMaps.some((change) => !change.column || change.column.isUpdate)
		);
	}

	/**
	 * Checks if this subject must be soft-removed into the database.
	 * Subject can be updated in the database if it is allowed to be soft-removed (explicitly persisted or by cascades)
	 * and if it does have differentiated columns or relations.
	 */
	get mustBeSoftRemoved() {
		return (
			this.canBeSoftRemoved &&
			this.identifier &&
			(this.databaseEntityLoaded === false || (this.databaseEntityLoaded && this.databaseEntity))
		);
	}

	/**
	 * Checks if this subject must be recovered into the database.
	 * Subject can be updated in the database if it is allowed to be recovered (explicitly persisted or by cascades)
	 * and if it does have differentiated columns or relations.
	 */
	get mustBeRecovered() {
		return (
			this.canBeRecovered &&
			this.identifier &&
			(this.databaseEntityLoaded === false || (this.databaseEntityLoaded && this.databaseEntity))
		);
	}

	// -------------------------------------------------------------------------
	// Public Methods
	// -------------------------------------------------------------------------

	/**
	 * Creates a value set needs to be inserted / updated in the database.
	 * Value set is based on the entity and change maps of the subject.
	 * Important note: this method pops data from this subject's change maps.
	 */
	createValueSetAndPopChangeMap(): ObjectLiteral {
		const changeMapsWithoutValues: SubjectChangeMap[] = [];
		const changeSet = this.changeMaps.reduce((updateMap, changeMap) => {
			let value = changeMap.value;
			if (InstanceChecker.isSubject(value)) {
				// referenced columns can refer on values both which were just inserted and which were present in the model
				// if entity was just inserted valueSets must contain all values from the entity and values just inserted in the database
				// so, here we check if we have a value set then we simply use it as value to get our reference column values
				// otherwise simply use an entity which cannot be just inserted at the moment and have all necessary data
				value = value.insertedValueSet ? value.insertedValueSet : value.entity;
			}
			// value = changeMap.valueFactory ? changeMap.valueFactory(value) : changeMap.column.createValueMap(value);

			let valueMap: ObjectLiteral | undefined;
			if (this.metadata.isJunction && changeMap.column) {
				valueMap = changeMap.column.createValueMap(
					changeMap.column.referencedColumn!.getEntityValue(value),
				);
			} else if (changeMap.column) {
				valueMap = changeMap.column.createValueMap(value);
			} else if (changeMap.relation) {
				// value can be a related object, for example: post.question = { id: 1 }
				// or value can be a null or direct relation id, e.g. post.question = 1
				// if its a direction relation id then we just set it to the valueMap,
				// however if its an object then we need to extract its relation id map and set it to the valueMap
				if (ObjectUtils.isObject(value) && !Buffer.isBuffer(value)) {
					// get relation id, e.g. referenced column name and its value,
					// for example: { id: 1 } which then will be set to relation, e.g. post.category = { id: 1 }
					const relationId = changeMap.relation!.getRelationIdMap(value);

					// but relation id can be empty, for example in the case when you insert a new post with category
					// and both post and category are newly inserted objects (by cascades) and in this case category will not have id
					// this means we need to insert post without question id and update post's questionId once question be inserted
					// that's why we create a new changeMap operation for future updation of the post entity
					if (relationId === undefined) {
						changeMapsWithoutValues.push(changeMap);
						this.canBeUpdated = true;
						return updateMap;
					}
					valueMap = changeMap.relation!.createValueMap(relationId);
					this.updatedRelationMaps.push({
						relation: changeMap.relation,
						value: relationId,
					});
				} else {
					// value can be "null" or direct relation id here
					valueMap = changeMap.relation!.createValueMap(value);
					this.updatedRelationMaps.push({
						relation: changeMap.relation,
						value: value,
					});
				}
			}

			OrmUtils.mergeDeep(updateMap, valueMap);
			return updateMap;
		}, {} as ObjectLiteral);
		this.changeMaps = changeMapsWithoutValues;
		return changeSet;
	}

	/**
	 * Recomputes entityWithFulfilledIds and identifier when entity changes.
	 */
	recompute(): void {
		if (this.entity) {
			this.entityWithFulfilledIds = Object.assign({}, this.entity);
			if (this.parentSubject) {
				this.metadata.primaryColumns.forEach((primaryColumn) => {
					if (
						primaryColumn.relationMetadata &&
						primaryColumn.relationMetadata.inverseEntityMetadata === this.parentSubject!.metadata
					) {
						const value = primaryColumn.referencedColumn!.getEntityValue(
							this.parentSubject!.entity!,
						);
						primaryColumn.setEntityValue(this.entityWithFulfilledIds!, value);
					}
				});
			}
			this.identifier = this.metadata.getEntityIdMap(this.entityWithFulfilledIds);
		} else if (this.databaseEntity) {
			this.identifier = this.metadata.getEntityIdMap(this.databaseEntity);
		}
	}
}
