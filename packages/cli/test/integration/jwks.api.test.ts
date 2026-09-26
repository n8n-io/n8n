import { setupTestServer } from './shared/utils';

describe('GET /.well-known/jwks.json', () => {
	const testServer = setupTestServer({ endpointGroups: ['jwks'] });

	test('returns an empty key set without authentication when no provider is registered', async () => {
		const response = await testServer.authlessAgent.get('/.well-known/jwks.json').expect(200);

		expect(response.body).toEqual({ keys: [] });
		expect(response.headers['cache-control']).toBe('public, max-age=3600, must-revalidate');
	});
});
