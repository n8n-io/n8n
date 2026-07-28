import { Container } from '@n8n/di';

import { ScheduledMetadata } from './scheduled-metadata';
import type { ScheduledHandlerClass, ScheduledOptions } from './scheduled-metadata';
import { NonMethodError } from '../errors';

/**
 * Registers a method as the handler for a durable-scheduler task type, found by
 * the boot-time scan. Also needs `@Service()` on the class.
 */
export const Scheduled =
	(opts: ScheduledOptions): MethodDecorator =>
	(prototype, propertyKey, descriptor) => {
		const handlerClass = prototype.constructor as ScheduledHandlerClass;
		const methodName = String(propertyKey);

		if (typeof descriptor?.value !== 'function') {
			throw new NonMethodError(`${handlerClass.name}.${methodName}()`);
		}

		Container.get(ScheduledMetadata).register({
			handlerClass,
			methodName,
			taskType: opts.type,
			instanceTypes: opts.instanceTypes,
		});
	};
