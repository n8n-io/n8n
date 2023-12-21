import type { ShutdownHookFn } from '@/shutdown/Shutdown.service';
import { ShutdownService } from '@/shutdown/Shutdown.service';
import { ApplicationError } from 'n8n-workflow';
import Container from 'typedi';

export type OnShutdownOpts = {
	priority?: number;
};

/**
 * Decorator that registers a method as a shutdown hook. The method will
 * be called when the application is shutting down.
 *
 * Priority is used to determine the order in which the hooks are called.
 *
 * @example
 * ```ts
 * class MyClass {
 *   @OnShutdown()
 *   async shutdown() {
 * 	   // Will be called when the app is shutting down
 *   }
 * }
 * ```
 */
export function OnShutdown({ priority }: OnShutdownOpts = {}) {
	return function (target: object, propertyKey: string, descriptor: PropertyDescriptor) {
		const name = `${target.constructor.name}.${propertyKey}()`;
		if (!descriptor) {
			throw new ApplicationError(`${name} must be a method to use "OnShutdown"`);
		}

		const shutdownFn = descriptor.value as ShutdownHookFn;
		if (typeof shutdownFn !== 'function') {
			throw new ApplicationError(`${name} must be a method to use "OnShutdown"`);
		}

		const shutdownService = Container.get(ShutdownService);
		const targetInstance = Container.get(target.constructor);
		shutdownService.register({
			name,
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			hook: shutdownFn.bind(targetInstance),
			priority,
		});
	};
}
