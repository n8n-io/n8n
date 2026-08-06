import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { TrustedKeySourceEntity } from '../../database/entities/trusted-key-source.entity';
import type { TrustedKeyService } from '../../services/trusted-key.service';
import { TrustedKeySourceController } from '../trusted-key-source.controller';

const trustedKeyService = mock<TrustedKeyService>();

const controller = new TrustedKeySourceController(trustedKeyService);

describe('TrustedKeySourceController', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('strips raw key material from static sources', async () => {
		trustedKeyService.listSources.mockResolvedValue([
			mock<TrustedKeySourceEntity>({
				id: 'static',
				type: 'static',
				issuer: null,
				status: 'healthy',
				lastError: null,
				lastRefreshedAt: new Date('2024-01-01T00:00:00.000Z'),
				managedBy: 'env-config',
				createdAt: new Date('2024-01-01T00:00:00.000Z'),
				updatedAt: new Date('2024-01-01T00:00:00.000Z'),
				config: JSON.stringify([
					{
						type: 'static',
						kid: 'key-1',
						algorithms: ['RS256'],
						key: '-----BEGIN PUBLIC KEY-----\nsecret\n-----END PUBLIC KEY-----',
						issuer: 'https://issuer.example.com',
					},
				]),
			}),
		]);

		const result = await controller.listSources(mock<AuthenticatedRequest>());

		expect(result).toEqual([
			expect.objectContaining({
				id: 'static',
				type: 'static',
				config: [
					{
						kid: 'key-1',
						algorithms: ['RS256'],
						issuer: 'https://issuer.example.com',
					},
				],
			}),
		]);
		expect(JSON.stringify(result)).not.toContain('BEGIN PUBLIC KEY');
	});

	it('sanitizes jwks sources', async () => {
		trustedKeyService.listSources.mockResolvedValue([
			mock<TrustedKeySourceEntity>({
				id: 'jwks-1',
				type: 'jwks',
				issuer: 'https://issuer.example.com',
				status: 'error',
				lastError: 'fetch failed',
				lastRefreshedAt: null,
				managedBy: 'sso-derived',
				createdAt: new Date('2024-01-01T00:00:00.000Z'),
				updatedAt: new Date('2024-01-02T00:00:00.000Z'),
				config: JSON.stringify({
					type: 'jwks',
					url: 'https://issuer.example.com/.well-known/jwks.json',
					issuer: 'https://issuer.example.com',
				}),
			}),
		]);

		const result = await controller.listSources(mock<AuthenticatedRequest>());

		expect(result).toEqual([
			expect.objectContaining({
				id: 'jwks-1',
				type: 'jwks',
				status: 'error',
				lastError: 'fetch failed',
				managedBy: 'sso-derived',
				config: {
					url: 'https://issuer.example.com/.well-known/jwks.json',
					issuer: 'https://issuer.example.com',
				},
			}),
		]);
	});

	it('exposes the inbound audience and subject claim of an SSO-derived source', async () => {
		trustedKeyService.listSources.mockResolvedValue([
			mock<TrustedKeySourceEntity>({
				id: 'jwks-1',
				type: 'jwks',
				issuer: 'https://issuer.example.com',
				status: 'healthy',
				lastError: null,
				lastRefreshedAt: null,
				managedBy: 'sso-derived',
				createdAt: new Date('2024-01-01T00:00:00.000Z'),
				updatedAt: new Date('2024-01-02T00:00:00.000Z'),
				config: JSON.stringify({
					type: 'jwks',
					url: 'https://issuer.example.com/.well-known/jwks.json',
					issuer: 'https://issuer.example.com',
					inboundAudiences: ['n8n-sso-client-id'],
					subjectClaim: 'uid',
				}),
			}),
		]);

		const result = await controller.listSources(mock<AuthenticatedRequest>());

		// These two decide whether a presented token is accepted at all, so an
		// admin reviewing the trust configuration has to be able to see them.
		expect(result[0].config).toMatchObject({
			inboundAudiences: ['n8n-sso-client-id'],
			subjectClaim: 'uid',
		});
	});
});
