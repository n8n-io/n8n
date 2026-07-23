import { Service } from '@n8n/di';
import { randomBytes } from 'node:crypto';

import { MAX_CSRF_AGE } from '@/oauth/types';
import { CacheService } from '@/services/cache/cache.service';

/**
 * A pending dynamic-credential authorization, captured at credential-gate time and
 * materialized into a real OAuth flow only when the user opens the short link. Holds
 * just enough to rebuild the flow at click-time — notably the caller's identity, so
 * the resolved credential is bound to the right subject regardless of who clicks.
 */
export type AuthorizeIntent = {
	credentialId: string;
	resolverId: string;
	/** Caller identity (the bearer/subject) the credential connection must be bound to. */
	identity: string;
	/**
	 * The n8n user the link was issued for, when the resolver maps to one. Set only
	 * for resolvers implementing `resolveOwningUserId`; absent for external-subject
	 * resolvers, which leaves the link unbound (any clicker with the token proceeds).
	 */
	userId?: string;
	metadata?: Record<string, unknown>;
};

const CACHE_PREFIX = 'dynamic-credentials:authorize-intent:';

/**
 * Stores short-lived "authorize intents" in the shared cache so a credential gate can
 * hand back a tiny n8n link (`/credentials/:id/authorize?token=…`) instead of a large
 * provider authorization URL. The cache is shared across mains, so the link can be
 * opened on a different main than the one that issued it.
 */
@Service()
export class AuthorizeIntentService {
	constructor(private readonly cacheService: CacheService) {}

	async create(intent: AuthorizeIntent): Promise<string> {
		const token = randomBytes(32).toString('base64url');
		// Matches the OAuth CSRF state lifetime: the link is only useful for the
		// duration of a handshake, and a short window limits the value of a leaked token.
		await this.cacheService.set(this.cacheKey(token), intent, MAX_CSRF_AGE);
		return token;
	}

	/** Read an intent without consuming it, so a failed click can be retried within the TTL. */
	async get(token: string): Promise<AuthorizeIntent | undefined> {
		return await this.cacheService.get<AuthorizeIntent>(this.cacheKey(token));
	}

	private cacheKey(token: string): string {
		return `${CACHE_PREFIX}${token}`;
	}
}
