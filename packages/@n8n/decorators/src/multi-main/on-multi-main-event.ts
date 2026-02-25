import { Container } from '@n8n/di';

import type { MultiMainEvent } from './multi-main-metadata';
import {
	LEADER_TAKEOVER_EVENT_NAME,
	LEADER_STEPDOWN_EVENT_NAME,
	MultiMainMetadata,
} from './multi-main-metadata';
import { NonMethodError } from '../errors';
import type { EventHandlerClass } from '../types';

const OnMultiMainEvent =
	(eventName: MultiMainEvent): MethodDecorator =>
	(prototype, propertyKey, descriptor) => {
		const eventHandlerClass = prototype.constructor as EventHandlerClass;
		const methodName = String(propertyKey);

		if (typeof descriptor?.value !== 'function') {
			throw new NonMethodError(`${eventHandlerClass.name}.${methodName}()`);
		}

		Container.get(MultiMainMetadata).register({
			eventHandlerClass,
			methodName,
			eventName,
		});
	};

/**
 * Decorator that registers a method to be called when this main instance becomes the leader.
 *
 * @example
 *
 * ```ts
 * @Service()
 * class MyService {
 *   @OnLeaderTakeover()
 *   async startDoingThings() {
 *     // ...
 *   }
 * }
 * ```
 */
export const OnLeaderTakeover = () => OnMultiMainEvent(LEADER_TAKEOVER_EVENT_NAME);

/**
 * Decorator that registers a method to be called when this main instance stops being the leader.
 *
 * @example
 *
 * ```ts
 * @Service()
 * class MyService {
 *   @OnLeaderStepdown()
 *   async stopDoingThings() {
 *     // ...
 *   }
 * }
 * ```
 */
export const OnLeaderStepdown = () => OnMultiMainEvent(LEADER_STEPDOWN_EVENT_NAME);
