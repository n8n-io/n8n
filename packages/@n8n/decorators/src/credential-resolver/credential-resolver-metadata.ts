import { Container, Service } from '@n8n/di';

import { CredentialResolverClass } from './credential-resolver';

type CredentialResolverEntry = {
	class: CredentialResolverClass;
};

/**
 * Registry service for credential resolver type discovery and instantiation.
 * Resolver classes decorated with @CredentialResolver() are automatically registered.
 */
@Service()
export class CredentialResolverEntryMetadata {
	private readonly credentialResolverEntries: Set<CredentialResolverEntry> = new Set();

	/** Registers a credential resolver class. Called automatically by @CredentialResolver() decorator. */
	register(credentialResolverEntry: CredentialResolverEntry) {
		this.credentialResolverEntries.add(credentialResolverEntry);
	}

	/** Returns all registered resolver entries as [index, entry] tuples. */
	getEntries() {
		return [...this.credentialResolverEntries.entries()];
	}

	/** Returns all registered resolver classes. */
	getClasses() {
		return [...this.credentialResolverEntries.values()].map((entry) => entry.class);
	}
}

/**
 * Decorator to mark a class as a credential resolver.
 * Automatically registers the resolver for discovery and enables dependency injection.
 *
 * @example
 * @CredentialResolver()
 * class MyResolver implements ICredentialResolver { ... }
 */
export const CredentialResolver =
	<T extends CredentialResolverClass>() =>
	(target: T) => {
		// Register resolver class for discovery by registry
		Container.get(CredentialResolverEntryMetadata).register({
			class: target,
		});

		// Enable dependency injection for the resolver class
		// eslint-disable-next-line @typescript-eslint/no-unsafe-return
		return Service()(target);
	};
