import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';
import type { Response } from 'express';
import type { JWK } from 'jose';
import { mock } from 'vitest-mock-extended';

import type { AuthlessRequest } from '@/requests';

import { JwksController } from '../jwks.controller';
import { JwksRegistry } from '../jwks.registry';

const encRsaJwk: JWK = {
	kty: 'RSA',
	kid: 'row-1',
	use: 'enc',
	alg: 'RSA-OAEP-256',
	n: 'modulus-base64url',
	e: 'AQAB',
};

describe('JwksController', () => {
	const jwksRegistry = mockInstance(JwksRegistry);
	const logger = mockInstance(Logger);

	const controller = Container.get(JwksController);

	let req: ReturnType<typeof mock<AuthlessRequest>>;
	let res: ReturnType<typeof mock<Response>>;

	beforeEach(() => {
		vi.resetAllMocks();
		req = mock<AuthlessRequest>();
		res = mock<Response>();
		res.setHeader.mockReturnThis();
		res.json.mockReturnThis();
	});

	describe('GET /.well-known/jwks.json', () => {
		test('returns the registered keys with a public Cache-Control header', async () => {
			jwksRegistry.getPublicJwks.mockResolvedValue([encRsaJwk]);

			await controller.getKeys(req, res);

			expect(res.json).toHaveBeenCalledWith({ keys: [encRsaJwk] });
			expect(res.setHeader).toHaveBeenCalledWith(
				'Cache-Control',
				'public, max-age=3600, must-revalidate',
			);
		});

		test('returns an empty keys array when no provider is registered', async () => {
			jwksRegistry.getPublicJwks.mockResolvedValue([]);

			await controller.getKeys(req, res);

			expect(res.json).toHaveBeenCalledWith({ keys: [] });
		});

		test('drops a key with private material and logs a warning', async () => {
			const jwkWithPrivateMaterial: JWK = {
				...encRsaJwk,
				kid: 'row-leaky',
				d: 'this-must-never-be-exposed',
			};
			jwksRegistry.getPublicJwks.mockResolvedValue([encRsaJwk, jwkWithPrivateMaterial]);

			await controller.getKeys(req, res);

			expect(res.json).toHaveBeenCalledWith({ keys: [encRsaJwk] });
			expect(logger.warn).toHaveBeenCalledWith(
				'Failed to parse public JWK',
				expect.objectContaining({ error: expect.anything() }),
			);
			expect(logger.warn).toHaveBeenCalledTimes(1);
		});

		test('drops an EC key with private material', async () => {
			const ecJwkWithPrivateMaterial: JWK = {
				kty: 'EC',
				kid: 'ec-leaky',
				use: 'enc',
				alg: 'ECDH-ES',
				crv: 'P-256',
				x: 'x-coordinate',
				y: 'y-coordinate',
				d: 'this-must-never-be-exposed',
			};
			jwksRegistry.getPublicJwks.mockResolvedValue([encRsaJwk, ecJwkWithPrivateMaterial]);

			await controller.getKeys(req, res);

			expect(res.json).toHaveBeenCalledWith({ keys: [encRsaJwk] });
			expect(logger.warn).toHaveBeenCalledTimes(1);
		});

		test('accepts a signing key', async () => {
			const sigRsaJwk: JWK = { ...encRsaJwk, kid: 'sig-1', use: 'sig', alg: 'RS256' };
			jwksRegistry.getPublicJwks.mockResolvedValue([encRsaJwk, sigRsaJwk]);

			await controller.getKeys(req, res);

			expect(res.json).toHaveBeenCalledWith({ keys: [encRsaJwk, sigRsaJwk] });
			expect(logger.warn).not.toHaveBeenCalled();
		});
	});
});
