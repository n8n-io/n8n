import type { FavoriteResourceType } from '@n8n/api-types';
import { Service } from '@n8n/di';
import type { Scope } from '@n8n/permissions';

export type FavoriteResourceMeta = { name: string; projectId: string };

/** Favorite types resolved by the backend module that owns the resource. */
export type ResolvedFavoriteResourceType = Extract<FavoriteResourceType, 'dataTable' | 'agent'>;

export interface FavoriteResourceResolver {
	readonly globalReadScope: Scope;
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
