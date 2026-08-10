import type { FavoriteResourceType } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

export type FavoriteResourceMeta = { name: string; projectId: string };

/**
 * Resolves favorited resources owned by another backend module. The owning
 * module registers its resolver in its `init()`, so favorites never depends
 * on module internals; if the module is inactive, no resolver exists and
 * favorites of that type are treated as missing resources.
 */
export interface FavoriteResourceResolver {
	/** Scope granting access to the resource regardless of project membership. */
	readonly globalReadScope: Scope;
	/** Per-id metadata; ids missing from the map are treated as deleted or inaccessible. */
	findMeta(ids: string[]): Promise<Map<string, FavoriteResourceMeta>>;
	exists(id: string): Promise<boolean>;
}

@Service()
export class FavoriteResourceResolverRegistry {
	private readonly resolvers = new Map<FavoriteResourceType, FavoriteResourceResolver>();

	register(type: FavoriteResourceType, resolver: FavoriteResourceResolver) {
		this.resolvers.set(type, resolver);
	}

	get(type: FavoriteResourceType): FavoriteResourceResolver | undefined {
		return this.resolvers.get(type);
	}
}
