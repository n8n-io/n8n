import { Container, Service } from 'typedi';
import { ApplicationError, ErrorReporterProxy, assert } from 'n8n-workflow';
import { Logger } from '@/Logger';

export interface ServiceClass {
	new (): Record<string, () => Promise<void> | void>;
}

export interface ShutdownHandler {
	serviceClass: ServiceClass;
	methodName: string;
}

/** Error reported when a listener fails to shutdown gracefully */
export class ComponentShutdownError extends ApplicationError {
	constructor(componentName: string, cause: Error) {
		super('Failed to shutdown gracefully', {
			level: 'error',
			cause,
			extra: { component: componentName },
		});
	}
}

/** Service responsible for orchestrating a graceful shutdown of the application */
@Service()
export class ShutdownService {
	private readonly handlersByPriority: ShutdownHandler[][] = [];

	private shutdownPromise: Promise<void> | undefined;

	constructor(private readonly logger: Logger) {}

	/** Registers given listener to be notified when the application is shutting down */
	register(priority: number, handler: ShutdownHandler) {
		if (!this.handlersByPriority[priority]) {
			this.handlersByPriority[priority] = [];
		}
		this.handlersByPriority[priority].push(handler);
	}

	/** Signals all registered listeners that the application is shutting down */
	shutdown() {
		if (this.shutdownPromise) {
			throw new ApplicationError('App is already shutting down');
		}

		this.shutdownPromise = this.startShutdown();
	}

	/** Returns a promise that resolves when all the registered listeners have shut down */
	async waitForShutdown(): Promise<void> {
		if (!this.shutdownPromise) {
			throw new ApplicationError('App is not shutting down');
		}

		await this.shutdownPromise;
	}

	isShuttingDown() {
		return !!this.shutdownPromise;
	}

	private async startShutdown() {
		const handlers = Object.values(this.handlersByPriority).reverse();
		for (const handlerGroup of handlers) {
			await Promise.allSettled(
				handlerGroup.map(async (handler) => this.shutdownComponent(handler)),
			);
		}
	}

	private async shutdownComponent({ serviceClass, methodName }: ShutdownHandler) {
		const name = `${serviceClass.name}.${methodName}()`;
		try {
			this.logger.debug(`Shutting down component "${name}"`);
			const service = Container.get(serviceClass);
			const method = service[methodName];
			await method.call(service);
		} catch (error) {
			assert(error instanceof Error);
			ErrorReporterProxy.error(new ComponentShutdownError(name, error));
		}
	}
}
