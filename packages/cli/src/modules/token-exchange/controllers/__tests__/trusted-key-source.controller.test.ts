import type { UpdateTrustedKeySourceDto } from '@n8n/api-types';
import type { Logger } from '@n8n/backend-common';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { TrustedKeySourceEntity } from '@/modules/identity-substrate/database/entities/trusted-key-source.entity';
import type { TrustedKeySyncService } from '@/modules/identity-substrate/services/trusted-key-sync.service';
import type { TrustedKeyService } from '@/modules/identity-substrate/services/trusted-key.service';

import { TrustedKeySourceController } from '../trusted-key-source.controller';

const trustedKeyService = mock<TrustedKeyService>();
const trustedKeySyncService = mock<TrustedKeySyncService>();

const controller = new TrustedKeySourceController(
	trustedKeyService,
	trustedKeySyncService,
	mock<Logger>(),
);

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

	it("exposes the admin policy separately from the source's derived config", async () => {
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
					inboundAudiences: ['from-env'],
				}),
				policy: JSON.stringify({ inboundAudiences: ['api://n8n'] }),
			}),
		]);

		const result = await controller.listSources(mock<AuthenticatedRequest>());

		// Both, not merged: the UI has to be able to show which value the admin
		// set and which one came from discovery/env.
		expect(result[0].policy).toEqual({ inboundAudiences: ['api://n8n'] });
		expect(result[0].config).toMatchObject({ inboundAudiences: ['from-env'] });
	});

	it('reports no policy when the admin has set none', async () => {
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
				config: JSON.stringify({ type: 'jwks', url: 'https://x/jwks', issuer: 'https://x' }),
				policy: null,
			}),
		]);

		const result = await controller.listSources(mock<AuthenticatedRequest>());

		expect(result[0].policy).toBeNull();
	});

	describe('updateSource', () => {
		it('applies the policy and returns the sanitized source', async () => {
			trustedKeySyncService.updateSourcePolicy.mockResolvedValue(
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
					config: JSON.stringify({ type: 'jwks', url: 'https://x/jwks', issuer: 'https://x' }),
					policy: JSON.stringify({ inboundAudiences: ['api://n8n'] }),
				}),
			);

			const result = await controller.updateSource(
				mock<AuthenticatedRequest>({ user: mock<AuthenticatedRequest['user']>({ id: 'user-1' }) }),
				undefined,
				'jwks-1',
				{ policy: { inboundAudiences: ['api://n8n'] } } as UpdateTrustedKeySourceDto,
			);

			expect(trustedKeySyncService.updateSourcePolicy).toHaveBeenCalledWith('jwks-1', {
				inboundAudiences: ['api://n8n'],
			});
			expect(result.policy).toEqual({ inboundAudiences: ['api://n8n'] });
		});

		it('never leaks key material in the response', async () => {
			trustedKeySyncService.updateSourcePolicy.mockResolvedValue(
				mock<TrustedKeySourceEntity>({
					id: 'static',
					type: 'static',
					issuer: null,
					status: 'healthy',
					lastError: null,
					lastRefreshedAt: null,
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
					policy: null,
				}),
			);

			const result = await controller.updateSource(
				mock<AuthenticatedRequest>({ user: mock<AuthenticatedRequest['user']>({ id: 'user-1' }) }),
				undefined,
				'static',
				{ policy: {} } as UpdateTrustedKeySourceDto,
			);

			expect(JSON.stringify(result)).not.toContain('BEGIN PUBLIC KEY');
		});
	});
});
