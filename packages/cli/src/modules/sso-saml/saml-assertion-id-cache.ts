import { CacheService } from '@n8n/backend-services';
import { Service } from '@n8n/di';
import { createHash } from 'crypto';
import type { ReplayCache } from 'samlify/types/src/types';

const CACHE_KEY_PREFIX = 'saml:assertion:';
const MIN_TTL_MS = 1000;

/**
 * Remembers each assertion that samlify accepts until the assertion expires,
 * so that an assertion signs a user in only once. With the Redis cache, all
 * mains see the same keys.
 */
@Service()
export class SamlAssertionIdCache implements ReplayCache {
	constructor(private readonly cacheService: CacheService) {}

	async saveIfAbsent(key: string, expiresAt: Date): Promise<boolean> {
		// samlify's key holds the issuer and the assertion ID, so its length is not fixed
		const cacheKey = CACHE_KEY_PREFIX + createHash('sha256').update(key).digest('hex');

		// Use `get`, not `exists`: on Redis, `exists` is true for a missing key.
		// CacheService has no atomic set-if-absent, so the check and the write are two steps.
		if ((await this.cacheService.get(cacheKey)) !== undefined) return false;

		const ttl = Math.max(expiresAt.getTime() - Date.now(), MIN_TTL_MS);
		await this.cacheService.set(cacheKey, '1', ttl);
		return true;
	}
}
