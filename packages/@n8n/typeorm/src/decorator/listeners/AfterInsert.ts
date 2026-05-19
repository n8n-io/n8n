import { getMetadataArgsStorage } from '../../globals';
import { EventListenerTypes } from '../../metadata/types/EventListenerTypes';
import { EntityListenerMetadataArgs } from '../../metadata-args/EntityListenerMetadataArgs';

/**
 * Calls a method on which this decorator is applied after this entity insertion.
 */
export function AfterInsert(): PropertyDecorator {
	return function (object: Object, propertyName: string) {
		getMetadataArgsStorage().entityListeners.push({
			target: object.constructor,
			propertyName: propertyName,
			type: EventListenerTypes.AFTER_INSERT,
		} as EntityListenerMetadataArgs);
	};
}
