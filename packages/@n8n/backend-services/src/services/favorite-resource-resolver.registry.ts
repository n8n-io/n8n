import type { FavoriteResourceType } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

export type FavoriteResourceMeta = { name: string; projectId: string };

/** Registered resolvers handle these favorite types. The favorites module handles all other types. */
export type ResolvedFavoriteResourceType = Extract<FavoriteResourceType, 'dataTable' | 'agent'>;

/**
 * Resolves favorite resources that another backend module owns. The owner
 * registers its resolver during module initialization. The favorites module
 * does not depend on the owner. An inactive module has no resolver, so the
 * favorites module treats its resources as missing.
 */
export interface FavoriteResourceResolver {
	/** This scope grants access without project membership. */
	readonly globalReadScope: Scope;
	/** Missing map entries identify deleted or inaccessible resources. */
	findMeta(ids: string[]): Promise<Map<string, FavoriteResourceMeta>>;
	exists(id: string): Promise<boolean>;
}

@Service()
export class FavoriteResourceResolverRegistry {
	private readonly resolvers = new Map<ResolvedFavoriteResourceType, FavoriteResourceResolver>();

	register(type: ResolvedFavoriteResourceType, resolver: FavoriteResourceResolver) {
		this.resolvers.set(type, resolver);
	}

	get(type: ResolvedFavoriteResourceType): FavoriteResourceResolver | undefined {
		return this.resolvers.get(type);
	}
}
