import type { OnShutdown } from '@/shutdown/Shutdown.service';
import { ShutdownService } from '@/shutdown/Shutdown.service';
import { ApplicationError } from 'n8n-workflow';
import Container from 'typedi';

/**
 * Decorator that registers a class as a shutdown subscriber. The class
 * must implement the `ShutdownListener` interface.
 *
 * @example
 * ```ts
 * @ShutdownListener()
 * class MyShutdownHandler implements OnShutdown {
 *   async onShutdown() {
 * 	   // Will be called when the app is shutting down
 *   }
 * }
 * ```
 */
export function ShutdownListener() {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	return function <T extends { new (...args: any[]): OnShutdown }>(constructor: T) {
		class ExtendedClass extends constructor {
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			constructor(...args: any[]) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				super(...args);

				if (typeof this.onShutdown !== 'function') {
					throw new ApplicationError(
						`Class "${constructor.name}" must implement "onShutdown" method`,
					);
				}

				const shutdownService = Container.get(ShutdownService);
				shutdownService.register(constructor.name, this as OnShutdown);
			}
		}

		return ExtendedClass;
	};
}
