import { Container } from '@n8n/di';

import { CacheService } from '@/services/cache/cache.service';

/**
 * Drops the policy read-through cache.
 *
 * Call this wherever a test truncates the policy tables: truncating writes behind the service,
 * so the cache keeps serving rows that no longer exist. Nothing in production edits those
 * tables without going through the service, which is why the service has no defence for it.
 *
 * `init` first, because `reset` has no lazy init of its own and a test may not have touched
 * the cache yet.
 */
export async function clearPolicyCache(): Promise<void> {
	const cache = Container.get(CacheService);
	await cache.init();
	await cache.reset();
}
