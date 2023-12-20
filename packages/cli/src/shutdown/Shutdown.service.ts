import { Service } from 'typedi';
import { ApplicationError, ErrorReporterProxy, assert } from 'n8n-workflow';

export interface OnShutdown {
	onShutdown(): Promise<void> | void;
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

type ToNotify = {
	name: string;
	listener: OnShutdown;
};

/**
 * Service responsible for orchestrating a graceful shutdown of the application.
 */
@Service()
export class ShutdownService {
	private readonly toNotify: ToNotify[] = [];

	private shutdownPromises: Array<Promise<void>> | undefined = undefined;

	/**
	 * Registers given listener to be notified when the application is shutting down.
	 */
	register(name: string, listener: OnShutdown) {
		this.toNotify.push({
			name,
			listener,
		});
	}

	/**
	 * Signals all registered listeners that the application is shutting down.
	 */
	shutdown() {
		if (this.shutdownPromises) {
			throw new ApplicationError('App is already shutting down');
		}

		this.shutdownPromises = Array.from(this.toNotify).map(async (listener) =>
			this.shutdownComponent(listener),
		);
	}

	/**
	 * Returns a promise that resolves when all the registered listeners
	 * have shut down.
	 */
	async waitForShutdown() {
		if (!this.shutdownPromises) {
			throw new ApplicationError('App is not shutting down');
		}

		await Promise.all(this.shutdownPromises);
	}

	isShuttingDown() {
		return !!this.shutdownPromises;
	}

	private async shutdownComponent(component: ToNotify) {
		try {
			await component.listener.onShutdown();
		} catch (error) {
			assert(error instanceof Error);
			ErrorReporterProxy.error(new ComponentShutdownError(component.name, error));
		}
	}
}
