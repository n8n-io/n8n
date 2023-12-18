import { Service } from 'typedi';
import { ApplicationError, ErrorReporterProxy } from 'n8n-workflow';

export interface OnShutdown {
	onShutdown(): Promise<void> | void;
}

/**
 * Error reported when a component fails to shutdown gracefully.
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
	private readonly toNotify: OnShutdown[] = [];

	private shutdownPromises: Promise<void>[] | undefined = undefined;

	/**
	 * Registers given component to be notified when the application is shutting down.
	 */
	register(component: OnShutdown) {
		console.log('Registering component', component.constructor.name);
		this.toNotify.push(component);
	}

	/**
	 * Signals all registered components that the application is shutting down.
	 */
	shutdown() {
		if (this.shutdownPromises) {
			throw new Error('App is already shutting down');
		}

		this.shutdownPromises = Array.from(this.toNotify).map((component) =>
			this.shutdownComponent(component),
		);
	}

	/**
	 * Returns a promise that resolves when all the registered components
	 * have shut down.
	 */
	async waitForShutdown() {
		if (!this.shutdownPromises) {
			throw new Error('App is not shutting down');
		}

		return await Promise.all(this.shutdownPromises);
	}

	isShuttingDown() {
		return !!this.shutdownPromises;
	}

	private async shutdownComponent(component: OnShutdown) {
		try {
			await component.onShutdown();
		} catch (error) {
			const componentName = component.constructor.name;
			ErrorReporterProxy.error(new ComponentShutdownError(componentName, error));
		}
	}
}
