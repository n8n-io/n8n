import { EventListenerType } from './types/EventListenerTypes';
import { EntityListenerMetadataArgs } from '../metadata-args/EntityListenerMetadataArgs';
import { ObjectLiteral } from '../common/ObjectLiteral';
import { EntityMetadata } from './EntityMetadata';
import { EmbeddedMetadata } from './EmbeddedMetadata';

/**
 * This metadata contains all information about entity's listeners.
 */
export class EntityListenerMetadata {
	// ---------------------------------------------------------------------
	// Properties
	// ---------------------------------------------------------------------

	/**
	 * Entity metadata of the listener.
	 */
	entityMetadata: EntityMetadata;

	/**
	 * Embedded metadata of the listener, in the case if listener is in embedded.
	 */
	embeddedMetadata?: EmbeddedMetadata;

	/**
	 * Target class to which metadata is applied.
	 * This can be different then entityMetadata.target in the case if listener is in the embedded.
	 */
	target: Function | string;

	/**
	 * Target's property name to which this metadata is applied.
	 */
	propertyName: string;

	/**
	 * The type of the listener.
	 */
	type: EventListenerType;

	// ---------------------------------------------------------------------
	// Constructor
	// ---------------------------------------------------------------------

	constructor(options: {
		entityMetadata: EntityMetadata;
		embeddedMetadata?: EmbeddedMetadata;
		args: EntityListenerMetadataArgs;
	}) {
		this.entityMetadata = options.entityMetadata;
		this.embeddedMetadata = options.embeddedMetadata;
		this.target = options.args.target;
		this.propertyName = options.args.propertyName;
		this.type = options.args.type;
	}

	// ---------------------------------------------------------------------
	// Public Methods
	// ---------------------------------------------------------------------

	/**
	 * Checks if entity listener is allowed to be executed on the given entity.
	 */
	isAllowed(entity: ObjectLiteral) {
		// todo: create in entity metadata method like isInherited?
		return (
			this.entityMetadata.target === entity.constructor || // todo: .constructor won't work for entity schemas, but there are no entity listeners in schemas since there are no objects, right?
			(typeof this.entityMetadata.target === 'function' &&
				entity.constructor.prototype instanceof this.entityMetadata.target)
		); // todo: also need to implement entity schema inheritance
	}

	/**
	 * Executes listener method of the given entity.
	 */
	execute(entity: ObjectLiteral) {
		if (!this.embeddedMetadata) return entity[this.propertyName]();

		this.callEntityEmbeddedMethod(entity, this.embeddedMetadata.propertyPath.split('.'));
	}

	// ---------------------------------------------------------------------
	// Protected Methods
	// ---------------------------------------------------------------------

	/**
	 * Calls embedded entity listener method no matter how nested it is.
	 */
	protected callEntityEmbeddedMethod(entity: ObjectLiteral, propertyPaths: string[]): void {
		const propertyPath = propertyPaths.shift();
		if (!propertyPath || !entity[propertyPath]) return;

		if (propertyPaths.length === 0) {
			if (Array.isArray(entity[propertyPath])) {
				entity[propertyPath].map((embedded: ObjectLiteral) => embedded[this.propertyName]());
			} else {
				entity[propertyPath][this.propertyName]();
			}
		} else {
			if (entity[propertyPath]) this.callEntityEmbeddedMethod(entity[propertyPath], propertyPaths);
		}
	}
}
