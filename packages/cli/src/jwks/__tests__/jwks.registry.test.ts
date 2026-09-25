import type { JWK } from 'jose';

import { type JwksProvider, JwksRegistry } from '../jwks.registry';

const encKey: JWK = {
	kty: 'RSA',
	kid: 'enc-1',
	use: 'enc',
	alg: 'RSA-OAEP-256',
	n: 'n',
	e: 'AQAB',
};
const sigKey: JWK = { kty: 'RSA', kid: 'sig-1', use: 'sig', alg: 'RS256', n: 'n', e: 'AQAB' };

const provider = (id: string, getPublicJwks: () => Promise<JWK[]>): JwksProvider => ({
	id,
	getPublicJwks,
});

describe('JwksRegistry', () => {
	test('returns an empty list when no provider is registered', async () => {
		const registry = new JwksRegistry();

		await expect(registry.getPublicJwks()).resolves.toEqual([]);
	});

	test('returns the union of the keys of every provider', async () => {
		const registry = new JwksRegistry();
		registry.register(provider('enc', async () => [encKey]));
		registry.register(provider('sig', async () => [sigKey]));

		await expect(registry.getPublicJwks()).resolves.toEqual([encKey, sigKey]);
	});

	test('propagates a provider error to the caller', async () => {
		const registry = new JwksRegistry();
		registry.register(provider('enc', async () => [encKey]));
		registry.register(
			provider('broken', async () => {
				throw new Error('key store unavailable');
			}),
		);

		await expect(registry.getPublicJwks()).rejects.toThrow('key store unavailable');
	});
});
