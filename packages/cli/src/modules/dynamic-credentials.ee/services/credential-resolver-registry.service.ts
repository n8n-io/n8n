import { Logger } from '@n8n/backend-common';
import { CredentialResolverEntryMetadata, ICredentialResolver } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';

/**
 * Registry service for discovering, instantiating, and managing credential resolver implementations.
 * Automatically discovers all classes decorated with @CredentialResolver() and makes them available by name.
 */
@Service()
export class CredentialResolverRegistry {
	/** Map of resolver names to resolver instances */
	private resolverMap: Map<string, ICredentialResolver> = new Map();

	constructor(
		private readonly credentialResolverEntryMetadata: CredentialResolverEntryMetadata,
		private readonly logger: Logger,
	) {}

	/**
	 * Discovers and registers all credential resolver implementations.
	 * Instantiates each resolver class, calls optional init() method, and registers by metadata.name.
	 * Skips resolvers that fail instantiation, initialization, or have duplicate names.
	 */
	async init() {
		this.resolverMap.clear();

		const resolverClasses = this.credentialResolverEntryMetadata.getClasses();
		this.logger.debug(`Registering ${resolverClasses.length} credential resolvers.`);

		for (const ResolverClass of resolverClasses) {
			let resolver: ICredentialResolver;
			try {
				resolver = Container.get(ResolverClass);
			} catch (error) {
				this.logger.error(
					`Failed to instantiate credential resolver class "${ResolverClass.name}": ${(error as Error).message}`,
					{ error },
				);
				continue;
			}

			if (this.resolverMap.has(resolver.metadata.name)) {
				this.logger.warn(
					`Credential resolver with name "${resolver.metadata.name}" is already registered. Conflicting classes are "${this.resolverMap.get(resolver.metadata.name)?.constructor.name}" and "${ResolverClass.name}". Skipping the latter.`,
				);
				continue;
			}

			if (resolver.init) {
				try {
					await resolver.init();
				} catch (error) {
					this.logger.error(
						`Failed to initialize credential resolver "${resolver.metadata.name}": ${(error as Error).message}`,
						{ error },
					);
					continue;
				}
			}
			this.resolverMap.set(resolver.metadata.name, resolver);
		}
	}

	/**
	 * Retrieves a registered resolver by its metadata name.
	 * @returns The resolver instance, or undefined if not found
	 */
	getResolverByName(name: string): ICredentialResolver | undefined {
		return this.resolverMap.get(name);
	}

	/**
	 * Returns all successfully registered resolver instances.
	 */
	getAllResolvers(): ICredentialResolver[] {
		return Array.from(this.resolverMap.values());
	}
}
