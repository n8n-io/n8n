import { Service } from 'typedi';
import { ApplicationError, ErrorReporterProxy, assert } from 'n8n-workflow';
import { Logger } from '@/Logger';

export type ShutdownHookFn = () => Promise<void> | void;

export interface ShutdownHook {
	name: string;
	hook: ShutdownHookFn;
	priority?: number;
}

/**
 * Error reported when a listener fails to shutdown gracefully.
 */
export class ComponentShutdownError extends ApplicationError {
	constructor(componentName: string, cause: Error) {
		super('Failed to shutdown gracefully', {
			level: 'error',
			cause,
			extra: { component: componentName },
		});
	}
}

/**
 * Service responsible for orchestrating a graceful shutdown of the application.
 */
@Service()
export class ShutdownService {
	private readonly toNotify: ShutdownHook[] = [];

	private shutdownPromise: Promise<void> | undefined;

	constructor(private readonly logger: Logger) {}

	/**
	 * Registers given listener to be notified when the application is shutting down.
	 */
	register(hook: ShutdownHook) {
		this.toNotify.push(hook);
	}

	/**
	 * Signals all registered listeners that the application is shutting down.
	 */
	shutdown() {
		if (this.shutdownPromise) {
			throw new ApplicationError('App is already shutting down');
		}

		const hooksByPriority = this.groupAndSortShutdownHooksByPriority(this.toNotify);

		this.shutdownPromise = this.shutdownByPriority(hooksByPriority);
	}

	/**
	 * Returns a promise that resolves when all the registered listeners
	 * have shut down.
	 */
	async waitForShutdown(): Promise<void> {
		if (!this.shutdownPromise) {
			throw new ApplicationError('App is not shutting down');
		}

		await this.shutdownPromise;
	}

	isShuttingDown() {
		return !!this.shutdownPromise;
	}

	private async shutdownByPriority(hooksByPriority: Map<number, ShutdownHook[]>) {
		for (const [priority, shutdownHooks] of hooksByPriority) {
			this.logger.debug(`Shutting down components with priority ${priority}`);

			await Promise.allSettled(shutdownHooks.map(async (hook) => this.shutdownComponent(hook)));
		}
	}

	private async shutdownComponent(component: ShutdownHook) {
		try {
			this.logger.debug(`Shutting down component "${component.name}"`);
			await component.hook();
		} catch (error) {
			assert(error instanceof Error);
			ErrorReporterProxy.error(new ComponentShutdownError(component.name, error));
		}
	}

	private groupAndSortShutdownHooksByPriority(hooks: ShutdownHook[]) {
		const hooksByPriority = new Map<number, ShutdownHook[]>();

		for (const hook of hooks) {
			const priority = hook.priority ?? 0;

			if (!hooksByPriority.has(priority)) {
				hooksByPriority.set(priority, []);
			}

			hooksByPriority.get(priority)!.push(hook);
		}

		return new Map([...hooksByPriority.entries()].sort((a, b) => b[0] - a[0]));
	}
}
