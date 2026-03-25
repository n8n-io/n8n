import { mockInstance } from '@n8n/backend-test-utils';
import type { AuthenticatedRequest } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';

import { PublicApiKeyService } from '@/services/public-api-key.service';
import type { RefreshToken } from '@/modules/oauth/database/entities/oauth-refresh-token.entity';
import { RefreshTokenRepository } from '@/modules/oauth/database/repositories/oauth-refresh-token.repository';
import { AccessTokenRepository } from '@/modules/oauth/database/repositories/oauth-access-token.repository';
import { OAuthClientsController } from '../controllers/oauth-clients.controller';

let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
let accessTokenRepository: jest.Mocked<AccessTokenRepository>;
let publicApiKeyService: jest.Mocked<PublicApiKeyService>;
let controller: OAuthClientsController;

describe('OAuthClientsController', () => {
	beforeAll(() => {
		refreshTokenRepository = mockInstance(RefreshTokenRepository);
		accessTokenRepository = mockInstance(AccessTokenRepository);
		publicApiKeyService = mockInstance(PublicApiKeyService);
		const { Logger } = jest.requireMock('@n8n/backend-common');
		controller = new OAuthClientsController(
			new Logger(),
			publicApiKeyService,
			refreshTokenRepository,
			accessTokenRepository,
		);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('listSessions', () => {
		it('should return active CLI sessions with metadata', async () => {
			const now = Date.now();
			const createdAt = new Date(now - 3600_000); // 1 hour ago

			refreshTokenRepository.find.mockResolvedValue([
				mock<RefreshToken>({
					token: 'abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
					clientId: 'n8n-cli',
					userId: 'user-1',
					expiresAt: now + 30 * 24 * 3600_000, // 30 days from now
					scopes: JSON.stringify(['workflow:read', 'tag:create']),
					metadata: JSON.stringify({ deviceName: 'My-Mac', os: 'macOS', ip: '127.0.0.1' }),
					createdAt,
				}),
			]);

			publicApiKeyService.redactApiKey.mockReturnValue('******7890');

			const req = mock<AuthenticatedRequest>();
			req.user = { id: 'user-1' } as never;
			const res = mock<Response>();

			const result = await controller.listSessions(req, res);

			expect(result.count).toBe(1);
			expect(result.data[0]).toEqual(
				expect.objectContaining({
					id: '******7890',
					scopes: ['workflow:read', 'tag:create'],
					deviceName: 'My-Mac',
					os: 'macOS',
					ip: '127.0.0.1',
				}),
			);
			expect(result.data[0].accessTokenExpiresAt).toBeDefined();
			expect(result.data[0].refreshTokenExpiresAt).toBeDefined();
		});

		it('should filter out expired sessions', async () => {
			const now = Date.now();

			refreshTokenRepository.find.mockResolvedValue([
				mock<RefreshToken>({
					token: 'valid-token-xxxx',
					clientId: 'n8n-cli',
					userId: 'user-1',
					expiresAt: now + 1000000,
					scopes: null,
					metadata: null,
					createdAt: new Date(),
				}),
				mock<RefreshToken>({
					token: 'expired-token-xx',
					clientId: 'n8n-cli',
					userId: 'user-1',
					expiresAt: now - 1000, // expired
					scopes: null,
					metadata: null,
					createdAt: new Date(),
				}),
			]);

			publicApiKeyService.redactApiKey.mockReturnValue('******xxxx');

			const req = mock<AuthenticatedRequest>();
			req.user = { id: 'user-1' } as never;
			const res = mock<Response>();

			const result = await controller.listSessions(req, res);

			expect(result.count).toBe(1);
		});

		it('should handle sessions without metadata', async () => {
			const now = Date.now();

			refreshTokenRepository.find.mockResolvedValue([
				mock<RefreshToken>({
					token: 'token-no-metadata',
					clientId: 'n8n-cli',
					userId: 'user-1',
					expiresAt: now + 1000000,
					scopes: null,
					metadata: null,
					createdAt: new Date(),
				}),
			]);

			publicApiKeyService.redactApiKey.mockReturnValue('******data');

			const req = mock<AuthenticatedRequest>();
			req.user = { id: 'user-1' } as never;
			const res = mock<Response>();

			const result = await controller.listSessions(req, res);

			expect(result.data[0].deviceName).toBeNull();
			expect(result.data[0].os).toBeNull();
			expect(result.data[0].ip).toBeNull();
			expect(result.data[0].scopes).toEqual([]);
		});

		it('should return empty list when no sessions exist', async () => {
			refreshTokenRepository.find.mockResolvedValue([]);

			const req = mock<AuthenticatedRequest>();
			req.user = { id: 'user-1' } as never;
			const res = mock<Response>();

			const result = await controller.listSessions(req, res);

			expect(result.data).toEqual([]);
			expect(result.count).toBe(0);
		});
	});

	describe('revokeSession', () => {
		it('should revoke a session by matching redacted token', async () => {
			refreshTokenRepository.find.mockResolvedValue([
				mock<RefreshToken>({
					token: 'full-token-value',
					clientId: 'n8n-cli',
					userId: 'user-1',
				}),
			]);

			publicApiKeyService.redactApiKey.mockReturnValue('******alue');
			refreshTokenRepository.delete.mockResolvedValue({ affected: 1 } as never);
			accessTokenRepository.delete.mockResolvedValue({ affected: 1 } as never);

			const req = mock<AuthenticatedRequest>();
			req.user = { id: 'user-1' } as never;
			const res = mock<Response>();

			const result = await controller.revokeSession(req, res, '******alue');

			expect(result.success).toBe(true);
			expect(refreshTokenRepository.delete).toHaveBeenCalledWith({
				token: 'full-token-value',
			});
			expect(accessTokenRepository.delete).toHaveBeenCalledWith({
				userId: 'user-1',
				clientId: 'n8n-cli',
			});
		});

		it('should throw NotFoundError when session does not exist', async () => {
			refreshTokenRepository.find.mockResolvedValue([]);

			publicApiKeyService.redactApiKey.mockReturnValue('******xxxx');

			const req = mock<AuthenticatedRequest>();
			req.user = { id: 'user-1' } as never;
			const res = mock<Response>();

			await expect(controller.revokeSession(req, res, 'nonexistent')).rejects.toThrow(
				'CLI session not found',
			);
		});
	});
});
