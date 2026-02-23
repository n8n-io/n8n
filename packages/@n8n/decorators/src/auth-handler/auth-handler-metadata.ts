import { Container, Service } from '@n8n/di';

import { AuthHandlerClass } from './auth-handler';

type AuthHandlerEntry = {
	class: AuthHandlerClass;
};

/**
 * Registry service for auth handler type discovery and instantiation.
 * Handler classes decorated with @AuthHandler() are automatically registered.
 */
@Service()
export class AuthHandlerEntryMetadata {
	private readonly authHandlerEntries: Set<AuthHandlerEntry> = new Set();

	/** Registers an auth handler class. Called automatically by @AuthHandler() decorator. */
	register(authHandlerEntry: AuthHandlerEntry) {
		this.authHandlerEntries.add(authHandlerEntry);
	}

	/** Returns all registered handler entries as [index, entry] tuples. */
	getEntries() {
		return [...this.authHandlerEntries.entries()];
	}

	/** Returns all registered handler classes. */
	getClasses() {
		return [...this.authHandlerEntries.values()].map((entry) => entry.class);
	}
}

/**
 * Decorator to mark a class as an authentication handler.
 * Automatically registers the handler for discovery and enables dependency injection.
 *
 * @example
 * @AuthHandler()
 * class LdapAuthHandler implements IPasswordAuthHandler {
 *   metadata = { name: 'ldap', type: 'password' };
 *   async handleLogin(loginId: string, password: string) { ... }
 * }
 */
export const AuthHandler =
	<T extends AuthHandlerClass>() =>
	(target: T) => {
		// Register handler class for discovery by registry
		Container.get(AuthHandlerEntryMetadata).register({
			class: target,
		});

		// Enable dependency injection for the handler class
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
