import { Service } from '@n8n/di';

/** Resource types that `@ProjectScope` checks and that another backend module owns. */
export type ScopedResourceType = 'dataTable';

/**
 * Finds the project that owns a module-provided resource, so `userHasScopes`
 * can check project access without importing the module. The owning module
 * registers its resolver in `init()`. No resolver means the module is inactive.
 */
export interface ScopedResourceResolver {
	/** The id of the owning project, or `null` when the resource does not exist. */
	findProjectId(resourceId: string): Promise<string | null>;
}

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
