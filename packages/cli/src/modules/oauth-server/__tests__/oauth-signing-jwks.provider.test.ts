import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { JWK } from 'jose';

import { OAuthSigningJwksProvider } from '../oauth-signing-jwks.provider';
import { OAuthSigningKeyService } from '../oauth-signing-key.service';

const validSigningJwk: JWK = {
	kty: 'RSA',
	kid: 'row-sig',
	use: 'sig',
	alg: 'RS256',
	n: 'modulus-base64url',
	e: 'AQAB',
};

describe('OAuthSigningJwksProvider', () => {
	const signingKeyService = mockInstance(OAuthSigningKeyService);
	const logger = mockInstance(Logger);

	const provider = Container.get(OAuthSigningJwksProvider);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('returns an RS256 signing key', async () => {
		signingKeyService.getPublicJwks.mockResolvedValue([validSigningJwk]);

		await expect(provider.getPublicJwks()).resolves.toEqual([validSigningJwk]);
		expect(logger.warn).not.toHaveBeenCalled();
	});

	test('drops an encryption key', async () => {
		const encryptionJwk: JWK = { ...validSigningJwk, kid: 'row-enc', use: 'enc' };
		signingKeyService.getPublicJwks.mockResolvedValue([validSigningJwk, encryptionJwk]);

		await expect(provider.getPublicJwks()).resolves.toEqual([validSigningJwk]);
		expect(logger.warn).toHaveBeenCalledTimes(1);
	});

	test('drops a key with another algorithm', async () => {
		const rs512Jwk: JWK = { ...validSigningJwk, kid: 'row-rs512', alg: 'RS512' };
		signingKeyService.getPublicJwks.mockResolvedValue([rs512Jwk]);

		await expect(provider.getPublicJwks()).resolves.toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to parse public signing JWK',
			expect.objectContaining({ error: expect.anything() }),
		);
	});

	test('drops a key with private members', async () => {
		const leakyJwk: JWK = {
			...validSigningJwk,
			kid: 'row-leaky',
			d: 'this-must-never-be-exposed',
		};
		signingKeyService.getPublicJwks.mockResolvedValue([validSigningJwk, leakyJwk]);

		await expect(provider.getPublicJwks()).resolves.toEqual([validSigningJwk]);
		expect(logger.warn).toHaveBeenCalledTimes(1);
	});
});
