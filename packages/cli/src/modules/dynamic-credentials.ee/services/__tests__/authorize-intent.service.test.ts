import { mock } from 'vitest-mock-extended';

import type { CacheService } from '@/services/cache/cache.service';

import { AuthorizeIntentService, type AuthorizeIntent } from '../authorize-intent.service';

describe('AuthorizeIntentService', () => {
	const cacheService = mock<CacheService>();
	const service = new AuthorizeIntentService(cacheService);

	const intent: AuthorizeIntent = {
		credentialId: 'cred-1',
		resolverId: 'resolver-1',
		identity: 'bearer-jwt',
		metadata: { source: 'n8n-oauth' },
	};

	beforeEach(() => vi.clearAllMocks());

	it('stores the intent under a prefixed key and returns an opaque token', async () => {
		const token = await service.create(intent);

		expect(typeof token).toBe('string');
		expect(token.length).toBeGreaterThan(20);
		// URL-safe (base64url) so it can ride in a query string without encoding.
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
		expect(cacheService.set).toHaveBeenCalledWith(
			`dynamic-credentials:authorize-intent:${token}`,
			intent,
			expect.any(Number),
		);
	});

	it('reads the intent back without deleting it (retryable within TTL)', async () => {
		cacheService.get.mockResolvedValue(intent);

		const result = await service.get('some-token');

		expect(result).toBe(intent);
		expect(cacheService.get).toHaveBeenCalledWith(
			'dynamic-credentials:authorize-intent:some-token',
		);
		expect(cacheService.delete).not.toHaveBeenCalled();
	});

	it('returns undefined for an unknown or expired token', async () => {
		cacheService.get.mockResolvedValue(undefined);

		expect(await service.get('gone')).toBeUndefined();
	});
});
