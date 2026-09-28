import { setupTestServer } from './shared/utils';

describe('GET /.well-known/jwks.json', () => {
	const testServer = setupTestServer({
		endpointGroups: ['jwks'],
		modules: ['oauth-jwe', 'oauth-server'],
	});

	test('returns the JWE key and the access-token signing key without authentication', async () => {
		const response = await testServer.authlessAgent.get('/.well-known/jwks.json').expect(200);

		const { keys } = response.body as { keys: Array<Record<string, string>> };
		expect(keys).toHaveLength(2);
		expect(keys).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ kty: 'RSA', use: 'enc', alg: 'RSA-OAEP-256' }),
				expect.objectContaining({ kty: 'RSA', use: 'sig', alg: 'RS256' }),
			]),
		);
		expect(keys[0].kid).not.toBe(keys[1].kid);
		expect(response.headers['cache-control']).toBe('public, max-age=3600, must-revalidate');
	});
});
