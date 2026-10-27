import { getMetadataArgsStorage } from '../../globals';
import { EventListenerTypes } from '../../metadata/types/EventListenerTypes';
import { EntityListenerMetadataArgs } from '../../metadata-args/EntityListenerMetadataArgs';

/**
 * Calls a method on which this decorator is applied after entity is loaded.
 */
export function AfterLoad(): PropertyDecorator {
	return function (object: Object, propertyName: string) {
		getMetadataArgsStorage().entityListeners.push({
			target: object.constructor,
			propertyName: propertyName,
			type: EventListenerTypes.AFTER_LOAD,
		} as EntityListenerMetadataArgs);
	};
}
