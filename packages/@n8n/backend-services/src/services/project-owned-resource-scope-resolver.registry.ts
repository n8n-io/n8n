import { Service } from '@n8n/di';

export interface ProjectOwnedResourceScopeResolver {
	findProjectId(resourceId: string): Promise<string | null>;
}

@Service()
export class ProjectOwnedResourceScopeResolverRegistry {
	private readonly resolvers = new Map<string, ProjectOwnedResourceScopeResolver>();

	register(resourceType: string, resolver: ProjectOwnedResourceScopeResolver): void {
		if (this.resolvers.has(resourceType)) {
			throw new Error(
				`A scope resolver is already registered for resource type "${resourceType}".`,
			);
		}

		this.resolvers.set(resourceType, resolver);
	}

	get(resourceType: string): ProjectOwnedResourceScopeResolver | undefined {
		return this.resolvers.get(resourceType);
	}
}
