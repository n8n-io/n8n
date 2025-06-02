import { Container } from '@n8n/di';

import { PubSubMetadata } from './pubsub-metadata';
import type { PubSubEventName, PubSubTriggerFilter } from './pubsub-metadata';
import { NonMethodError } from '../errors';
import type { EventHandlerClass } from '../types';

export const OnPubSubEvent =
	(eventName: PubSubEventName, filter?: PubSubTriggerFilter): MethodDecorator =>
	(prototype, propertyKey, descriptor) => {
		const eventHandlerClass = prototype.constructor as EventHandlerClass;
		const methodName = String(propertyKey);

		if (typeof descriptor?.value !== 'function') {
			throw new NonMethodError(`${eventHandlerClass.name}.${methodName}()`);
		}

		Container.get(PubSubMetadata).register({
			eventHandlerClass,
			methodName,
			eventName,
			filter,
		});
	};
