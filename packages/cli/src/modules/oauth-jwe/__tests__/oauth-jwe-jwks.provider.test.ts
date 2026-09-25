import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { JWK } from 'jose';

import { OAuthJweJwksProvider } from '../oauth-jwe-jwks.provider';
import { OAuthJweKeyService } from '../oauth-jwe-key.service';

const validRsaJwk: JWK = {
	kty: 'RSA',
	kid: 'row-1',
	use: 'enc',
	alg: 'RSA-OAEP-256',
	n: 'modulus-base64url',
	e: 'AQAB',
};

describe('OAuthJweJwksProvider', () => {
	const oauthJweKeyService = mockInstance(OAuthJweKeyService);
	const logger = mockInstance(Logger);

	const provider = Container.get(OAuthJweJwksProvider);

	beforeEach(() => {
		vi.resetAllMocks();
	});

	test('returns the public RSA JWK', async () => {
		oauthJweKeyService.getPublicJwks.mockResolvedValue([validRsaJwk]);

		await expect(provider.getPublicJwks()).resolves.toEqual([validRsaJwk]);
	});

	test('drops a JWK with an unsupported algorithm', async () => {
		const jwkWithUnsupportedAlg: JWK = { ...validRsaJwk, kid: 'row-bad-alg', alg: 'RS256' };
		oauthJweKeyService.getPublicJwks.mockResolvedValue([jwkWithUnsupportedAlg]);

		await expect(provider.getPublicJwks()).resolves.toEqual([]);
		expect(logger.warn).toHaveBeenCalledWith(
			'Failed to parse public JWE JWK',
			expect.objectContaining({ error: expect.anything() }),
		);
		expect(logger.warn).toHaveBeenCalledTimes(1);
	});

	test('drops malformed JWKs with a warn log and keeps the valid ones', async () => {
		const jwkWithPrivateMaterial: JWK = {
			...validRsaJwk,
			kid: 'row-leaky',
			d: 'this-must-never-be-exposed',
		};
		const jwkWithoutModulus: JWK = { ...validRsaJwk, kid: 'row-no-n', n: '' };
		oauthJweKeyService.getPublicJwks.mockResolvedValue([
			validRsaJwk,
			jwkWithPrivateMaterial,
			jwkWithoutModulus,
		]);

		await expect(provider.getPublicJwks()).resolves.toEqual([validRsaJwk]);
		expect(logger.warn).toHaveBeenCalledTimes(2);
	});
});
