import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import { mock } from 'jest-mock-extended';
import type { JWK } from 'jose';

import type { AuthlessRequest } from '@/requests';

import { OAuthJweKeyService } from '../oauth-jwe-key.service';
import { OAuthJweController } from '../oauth-jwe.controller';

const validRsaJwk: JWK = {
	kty: 'RSA',
	kid: 'row-1',
	use: 'enc',
	alg: 'RSA-OAEP-256',
	n: 'modulus-base64url',
	e: 'AQAB',
};

describe('OAuthJweController', () => {
	const oauthJweKeyService = mockInstance(OAuthJweKeyService);
	const logger = mockInstance(Logger);

	const controller = Container.get(OAuthJweController);

	let req: ReturnType<typeof mock<AuthlessRequest>>;
	let res: ReturnType<typeof mock<Response>>;

	beforeEach(() => {
		jest.resetAllMocks();
		req = mock<AuthlessRequest>();
		res = mock<Response>();
		res.setHeader.mockReturnThis();
		res.json.mockReturnThis();
	});

	describe('GET /.well-known/jwks.json', () => {
		test('returns a JWKS document with the public RSA JWK', async () => {
			oauthJweKeyService.getPublicJwks.mockResolvedValue([validRsaJwk]);

			await controller.getKeys(req, res);

			expect(res.json).toHaveBeenCalledWith({ keys: [validRsaJwk] });
		});

		test('sets a public Cache-Control header for IdP polling', async () => {
			oauthJweKeyService.getPublicJwks.mockResolvedValue([validRsaJwk]);

			await controller.getKeys(req, res);

			expect(res.setHeader).toHaveBeenCalledWith(
				'Cache-Control',
				'public, max-age=3600, must-revalidate',
			);
		});

		test('returns an empty keys array when the service has no keys', async () => {
			oauthJweKeyService.getPublicJwks.mockResolvedValue([]);

			await controller.getKeys(req, res);

			expect(res.json).toHaveBeenCalledWith({ keys: [] });
		});

		test('drops malformed JWKs with a warn log and keeps the valid ones', async () => {
			const jwkWithPrivateMaterial: JWK = {
				...validRsaJwk,
				kid: 'row-leaky',
				d: 'this-must-never-be-exposed',
			};

			oauthJweKeyService.getPublicJwks.mockResolvedValue([validRsaJwk, jwkWithPrivateMaterial]);

			await controller.getKeys(req, res);

			expect(res.json).toHaveBeenCalledWith({ keys: [validRsaJwk] });
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to parse public JWK',
				expect.objectContaining({ error: expect.anything() }),
			);
			expect(logger.warn).toHaveBeenCalledTimes(1);
		});

		test('drops a JWK with an unsupported algorithm', async () => {
			const jwkWithUnsupportedAlg: JWK = {
				...validRsaJwk,
				kid: 'row-bad-alg',
				alg: 'RS256',
			};

			oauthJweKeyService.getPublicJwks.mockResolvedValue([jwkWithUnsupportedAlg]);

			await controller.getKeys(req, res);

			expect(res.json).toHaveBeenCalledWith({ keys: [] });
			expect(logger.warn).toHaveBeenCalledTimes(1);
		});

		test('returns an empty keys array when every JWK is malformed', async () => {
			const malformedA: JWK = { ...validRsaJwk, kid: '', n: '' };
			const malformedB: JWK = { ...validRsaJwk, kid: 'row-no-n', n: '' };

			oauthJweKeyService.getPublicJwks.mockResolvedValue([malformedA, malformedB]);

			await controller.getKeys(req, res);

			expect(res.json).toHaveBeenCalledWith({ keys: [] });
			expect(logger.warn).toHaveBeenCalledTimes(2);
		});
	});
});
