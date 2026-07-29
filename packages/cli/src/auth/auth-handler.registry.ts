import { Logger } from '@n8n/backend-common';
import { User } from '@n8n/db';
import type { AuthType, IAuthHandler, IPasswordAuthHandler } from '@n8n/decorators';
import { AuthHandlerEntryMetadata } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';

function isUserHandler(handler: IAuthHandler): handler is IAuthHandler<User> {
	return handler.userClass === User;
}

/**
 * Registry service for discovering, instantiating, and managing auth handler implementations.
 * Automatically discovers all classes decorated with @AuthHandler() and makes them available by name.
 */
@Service()
export class AuthHandlerRegistry {
	/** Map of handler names to handler instances */
	private handlerMap: Map<string, IAuthHandler<User>> = new Map();

	constructor(
		private readonly authHandlerEntryMetadata: AuthHandlerEntryMetadata,
		private readonly logger: Logger,
	) {}

	/**
	 * Discovers and registers all auth handler implementations.
	 * Instantiates each handler class, calls optional init() method, and registers by metadata.name.
	 * Skips handlers that fail instantiation, initialization, or have duplicate names.
	 */
	async init() {
		this.handlerMap.clear();

		const handlerClasses = this.authHandlerEntryMetadata.getClasses();
		this.logger.debug(`Registering ${handlerClasses.length} auth handlers.`);

		for (const HandlerClass of handlerClasses) {
			let handler: IAuthHandler<User>;
			try {
				// We're casting here as we know all classes returned
				// by getClasses() implement IAuthHandler<User>
				const unknownHandler = Container.get(HandlerClass);
				if (isUserHandler(unknownHandler)) {
					handler = unknownHandler;
				} else {
					throw new Error(
						`Handler user class mismatch. Expected User but got ${unknownHandler.userClass.name}`,
					);
				}
			} catch (error) {
				this.logger.error(
					`Failed to instantiate auth handler class "${HandlerClass.name}": ${(error as Error).message}`,
					{ error },
				);
				continue;
			}

			if (this.handlerMap.has(handler.metadata.name)) {
				this.logger.warn(
					`Auth handler with name "${handler.metadata.name}" is already registered. Conflicting classes are "${this.handlerMap.get(handler.metadata.name)?.constructor.name}" and "${HandlerClass.name}". Skipping the latter.`,
				);
				continue;
			}

			if (handler.init) {
				try {
					await handler.init();
				} catch (error) {
					this.logger.error(
						`Failed to initialize auth handler "${handler.metadata.name}": ${(error as Error).message}`,
						{ error },
					);
					continue;
				}
			}
			this.handlerMap.set(handler.metadata.name, handler);
		}
	}

	/**
	 * Type guard to check if a handler is a password auth handler
	 */
	private isPasswordAuthHandler(
		handler: IAuthHandler<User>,
	): handler is IPasswordAuthHandler<User> {
		return handler.metadata.type === 'password';
	}

	/**
	 * Retrieves a registered handler by its metadata name.
	 * @returns The handler instance, or undefined if not found
	 */
	get(authMethod: string, type: 'password'): IPasswordAuthHandler<User> | undefined;
	get(authMethod: string, type: AuthType): IAuthHandler<User> | undefined;
	get(authMethod: string, type: AuthType): IAuthHandler<User> | undefined {
		const handler = this.handlerMap.get(authMethod);
		if (!handler) {
			return undefined;
		}
		if (handler.metadata.type !== type) {
			return undefined;
		}
		// When new types are added, add corresponding type guard check
		if (type === 'password' && this.isPasswordAuthHandler(handler)) {
			return handler;
		}
		return handler;
	}

	/**
	 * Checks if a handler is registered for the given auth method.
	 */
	has(authMethod: string): boolean {
		return this.handlerMap.has(authMethod);
	}
}
