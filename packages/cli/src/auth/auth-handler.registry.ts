import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

/**
 * Interface for authentication handlers that can be registered by modules.
 * Each handler should implement logic for a specific authentication method.
 */
export interface AuthenticationHandler {
	/**
	 * Check if this handler can handle the given authentication method
	 * @param authenticationMethod - The current authentication method (e.g., 'ldap', 'saml', 'email')
	 * @returns true if this handler can handle the authentication method
	 */
	canHandle(authenticationMethod: string): boolean;

	/**
	 * Attempt to log in a user with the given credentials
	 * @param emailOrLoginId - The email or login ID
	 * @param password - The password
	 * @returns The authenticated user or undefined if authentication failed
	 */
	handleLogin(emailOrLoginId: string, password: string): Promise<User | undefined>;

	/**
	 * Get the provider type this handler manages (e.g., 'ldap', 'saml')
	 * @returns The provider type string
	 */
	getProviderType(): string;

	/**
	 * Check if login is currently enabled for this authentication provider
	 * @returns true if login is enabled, false if disabled
	 */
	isLoginEnabled(): boolean;
}

/**
 * Registry service that manages authentication handlers.
 * Modules can register their authentication handlers here,
 * and the core can query if any handler can handle a specific authentication method.
 */
@Service()
export class AuthHandlerRegistry {
	private handlers: AuthenticationHandler[] = [];

	/**
	 * Register a new authentication handler
	 */
	registerHandler(handler: AuthenticationHandler): void {
		this.handlers.push(handler);
	}

	/**
	 * Check if any registered handler can handle the given authentication method
	 * @param authenticationMethod - The authentication method to check
	 * @returns true if any handler can handle this authentication method
	 */
	hasHandlerFor(authenticationMethod: string): boolean {
		return this.handlers.some((handler) => handler.canHandle(authenticationMethod));
	}

	/**
	 * Find and execute the first handler that can handle the given authentication method
	 * @param authenticationMethod - The authentication method
	 * @param emailOrLoginId - The email or login ID
	 * @param password - The password
	 * @returns The authenticated user or undefined if no handler could authenticate
	 */
	async handleLogin(
		authenticationMethod: string,
		emailOrLoginId: string,
		password: string,
	): Promise<User | undefined> {
		const handler = this.handlers.find((h) => h.canHandle(authenticationMethod));
		if (handler) {
			return await handler.handleLogin(emailOrLoginId, password);
		}
		return undefined;
	}

	/**
	 * Check if the user has an auth identity from a provider that is currently disabled
	 * @param user - The user to check
	 * @returns The disabled provider type, or undefined if all providers are enabled
	 */
	getDisabledProvidersForUser(user: User): string[] {
		const authIdentities = user.authIdentities || [];
		const disabledProviders: string[] = [];

		for (const identity of authIdentities) {
			const handler = this.handlers.find((h) => h.getProviderType() === identity.providerType);
			if (handler && !handler.isLoginEnabled()) {
				disabledProviders.push(identity.providerType);
			}
		}

		return disabledProviders;
	}
}
