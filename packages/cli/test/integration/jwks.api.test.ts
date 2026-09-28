import { setupTestServer } from './shared/utils';

describe('GET /.well-known/jwks.json', () => {
	const testServer = setupTestServer({
		endpointGroups: ['jwks'],
		modules: ['oauth-jwe', 'oauth-server'],
	});

	test('returns the JWE key and the access-token signing key without authentication', async () => {
		const response = await testServer.authlessAgent.get('/.well-known/jwks.json').expect(200);

		const { keys } = response.body as { keys: Array<Record<string, string>> };
		const encKeys = keys.filter((key) => key.use === 'enc');
		const sigKeys = keys.filter((key) => key.use === 'sig');
		expect(encKeys).toEqual([expect.objectContaining({ kty: 'RSA', alg: 'RSA-OAEP-256' })]);
		expect(sigKeys).toEqual([expect.objectContaining({ kty: 'RSA', alg: 'RS256' })]);
		expect(new Set(keys.map((key) => key.kid)).size).toBe(keys.length);
		expect(response.headers['cache-control']).toBe('public, max-age=3600, must-revalidate');
	});
});
