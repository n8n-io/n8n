import type { EntityManager } from '@n8n/typeorm';

const transactionManager = Symbol('oauthGrantTransaction');

// The private key keeps database access inside the persistence layer.
export interface OAuthGrantContext {
	readonly [transactionManager]: EntityManager;
}

export function createGrantContext(manager: EntityManager): OAuthGrantContext {
	return { [transactionManager]: manager };
}

export function managerForGrant(
	ctx: OAuthGrantContext | undefined,
	fallback: EntityManager,
): EntityManager {
	return ctx?.[transactionManager] ?? fallback;
}
