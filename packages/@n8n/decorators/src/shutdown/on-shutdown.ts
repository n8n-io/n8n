import { Container } from '@n8n/di';
import { UnexpectedError } from 'n8n-workflow';

import { DEFAULT_SHUTDOWN_PRIORITY } from './constants';
import { ShutdownMetadata } from './shutdown-metadata';
import type { ShutdownServiceClass } from './types';

/**
 * Decorator that registers a method as a shutdown hook. The method will
 * be called when the application is shutting down.
 *
 * Priority is used to determine the order in which the hooks are called.
 *
 * NOTE: Requires also @Service() decorator to be used on the class.
 *
 * @example
 * ```ts
 * @Service()
 * class MyClass {
 *   @OnShutdown()
 *   async shutdown() {
 * 	   // Will be called when the app is shutting down
 *   }
 * }
 * ```
 */
export const OnShutdown =
	(priority = DEFAULT_SHUTDOWN_PRIORITY): MethodDecorator =>
	(prototype, propertyKey, descriptor) => {
		const serviceClass = prototype.constructor as ShutdownServiceClass;
		const methodName = String(propertyKey);
		// TODO: assert that serviceClass is decorated with @Service
		if (typeof descriptor?.value === 'function') {
			Container.get(ShutdownMetadata).register(priority, { serviceClass, methodName });
		} else {
			const name = `${serviceClass.name}.${methodName}()`;
			throw new UnexpectedError(
				`${name} must be a method on ${serviceClass.name} to use "OnShutdown"`,
			);
		}
	};
