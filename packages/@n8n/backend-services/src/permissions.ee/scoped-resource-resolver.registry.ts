import { Service } from '@n8n/di';

/** Resource types that a scope check can get and that a backend module owns. */
export type ScopedResourceType = 'dataTable';

export interface ScopedResourceResolver {
	/** The ID of the project that owns the resource, or `null` when the resource does not exist. */
	findProjectId(resourceId: string): Promise<string | null>;
}

/**
 * Lets `userHasScopes` find the project of a module resource without an import of the module.
 * The module registers its resolver on init. No resolver means that the module is not active.
 */
@Service()
export class ScopedResourceResolverRegistry {
	private readonly resolvers = new Map<ScopedResourceType, ScopedResourceResolver>();

	register(type: ScopedResourceType, resolver: ScopedResourceResolver) {
		this.resolvers.set(type, resolver);
	}

	get(type: ScopedResourceType): ScopedResourceResolver | undefined {
		return this.resolvers.get(type);
	}
}
