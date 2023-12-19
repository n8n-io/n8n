import { OnShutdown, ShutdownService } from '@/shutdown/Shutdown.service';
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
	return function <T extends { new (...args: any[]): OnShutdown }>(constructor: T) {
		class ExtendedClass extends constructor {
			constructor(...args: any[]) {
				super(...args);

				if (typeof this.onShutdown !== 'function') {
					throw new Error(`Class "${constructor.name}" must implement "onShutdown" method`);
				}

				const shutdownService = Container.get(ShutdownService);
				shutdownService.register(constructor.name, this as OnShutdown);
			}
		}

		return ExtendedClass;
	};
}
