import { Container } from '@n8n/di';

import { ScheduledMetadata } from './scheduled-metadata';
import type { ScheduledHandlerClass, ScheduledOptions } from './scheduled-metadata';
import { NonMethodError } from '../errors';

/**
 * Registers a method as the handler for a durable-scheduler task type. The
 * scheduler discovers it at boot and invokes it when a task of that type is due;
 * adding a handler needs no change to the scheduler wiring.
 *
 * NOTE: Requires also `@Service()` on the class, so the container can resolve
 * the instance the method is called on. The class must be imported before the
 * boot-time scan runs, or the decorator never fires.
 *
 * @example
 * ```ts
 * @Service()
 * class MyHandler {
 *   @Scheduled({ type: 'schedule-trigger' })
 *   async handle(task: ClaimedTask, report: DispatchReporter) {
 *     // ...do the work...
 *     return report.dispatched();
 *   }
 * }
 * ```
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
