import * as auth from '../auth';

vi.mock('../services/cache/cache.service', () => {
	throw new Error('The auth entry point must not load cache services');
});

vi.mock('../services/redis-client.service', () => {
	throw new Error('The auth entry point must not load Redis services');
});

vi.mock('@n8n/db', () => {
	throw new Error('The auth entry point must not load persistence services');
});

describe('auth entry point', () => {
	it('loads auth registries and proxies without cache, Redis, or persistence services', () => {
		for (const service of [
			auth.AuthStrategyRegistry,
			auth.ProtectedResourceRegistry,
			auth.OAuthTokenVerifierProxy,
			auth.OAuth2FlowProxy,
			auth.RoleMappingProxyService,
			auth.JwksRegistry,
			auth.OAuthJweServiceProxy,
		]) {
			expect(service).toBeTypeOf('function');
		}
	});
});
