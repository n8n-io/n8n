import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { JwtService } from '@/services/jwt.service';

import type { AccessToken } from '../database/entities/oauth-access-token.entity';
import type { RefreshToken } from '../database/entities/oauth-refresh-token.entity';
import { AccessTokenRepository } from '../database/repositories/oauth-access-token.repository';
import { RefreshTokenRepository } from '../database/repositories/oauth-refresh-token.repository';
import { OAuthTokenService } from '../oauth-token.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });
const jwtService = new JwtService(instanceSettings, mock());

let logger: jest.Mocked<Logger>;
let userRepository: jest.Mocked<UserRepository>;
let accessTokenRepository: jest.Mocked<AccessTokenRepository>;
let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
let service: OAuthTokenService;
let mockTransactionManager: any;

const TEST_BASE_URL = 'https://n8n.example.com';
const TEST_RESOURCE_URL = `${TEST_BASE_URL}/mcp-server/http`;
const LEGACY_AUDIENCE = 'mcp-server-api';

const registry = new ProtectedResourceRegistry(mock<Logger>());
registry.register({
	id: 'instance-mcp',
	getResourceUrl: () => TEST_RESOURCE_URL,
	getAudiences: () => [TEST_RESOURCE_URL, LEGACY_AUDIENCE],
	scopes: [],
	isDefault: true,
});

describe('OAuthTokenService', () => {
	beforeAll(() => {
		logger = mockInstance(Logger);
		userRepository = mockInstance(UserRepository);
		accessTokenRepository = mockInstance(
			AccessTokenRepository,
		) as jest.Mocked<AccessTokenRepository>;
		refreshTokenRepository = mockInstance(
			RefreshTokenRepository,
		) as jest.Mocked<RefreshTokenRepository>;

		mockTransactionManager = {
			insert: jest.fn().mockResolvedValue(mock()),
			remove: jest.fn().mockResolvedValue(mock()),
			findOne: jest.fn(),
			delete: jest.fn(),
		};

		const mockManager: any = {
			transaction: jest.fn(async (cb: any) => await cb(mockTransactionManager)),
		};

		(accessTokenRepository as any).manager = mockManager;
		(accessTokenRepository as any).target = 'AccessToken';
		(refreshTokenRepository as any).manager = mockManager;
		(refreshTokenRepository as any).target = 'RefreshToken';

		service = new OAuthTokenService(
			logger,
			jwtService,
			userRepository,
			accessTokenRepository,
			refreshTokenRepository,
			registry,
		);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('generateTokenPair', () => {
		it('should generate JWT access token and opaque refresh token', () => {
			const userId = 'user-123';
			const clientId = 'client-456';

			const { accessToken, refreshToken } = service.generateTokenPair(userId, clientId);

			expect(accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format

			const decoded = jwtService.decode(accessToken);
			expect(decoded.sub).toBe(userId);
			expect(decoded.aud).toBe(TEST_RESOURCE_URL);
			expect(decoded.client_id).toBe(clientId);
			expect(decoded.meta.isOAuth).toBe(true);
			expect(decoded.jti).toBeDefined();
			expect(decoded.iat).toBeDefined();
			expect(decoded.exp).toBeDefined();

			expect(refreshToken).toHaveLength(64); // 32 bytes hex = 64 characters
			expect(refreshToken).toMatch(/^[a-f0-9]{64}$/);
		});

		it('should set aud to resource when resource is provided', () => {
			const { accessToken } = service.generateTokenPair(
				'user-123',
				'client-456',
				'https://n8n.example.com/mcp-server/http',
			);

			const decoded = jwtService.decode(accessToken);
			expect(decoded.aud).toBe('https://n8n.example.com/mcp-server/http');
		});

		it('should generate different tokens on each call', () => {
			const userId = 'user-123';
			const clientId = 'client-456';

			const pair1 = service.generateTokenPair(userId, clientId);
			const pair2 = service.generateTokenPair(userId, clientId);

			expect(pair1.accessToken).not.toBe(pair2.accessToken);
			expect(pair1.refreshToken).not.toBe(pair2.refreshToken);
		});
	});

	describe('saveTokenPair', () => {
		it('should save both tokens in a transaction', async () => {
			const accessToken = 'jwt-access-token';
			const refreshToken = 'opaque-refresh-token';
			const clientId = 'client-123';
			const userId = 'user-456';

			await service.saveTokenPair(accessToken, refreshToken, clientId, userId);

			const mockManager = accessTokenRepository.manager as any;
			expect(mockManager.transaction).toHaveBeenCalled();
			expect(mockTransactionManager.insert).toHaveBeenCalledTimes(2);

			expect(mockTransactionManager.insert).toHaveBeenCalledWith('AccessToken', {
				token: accessToken,
				clientId,
				userId,
			});

			expect(mockTransactionManager.insert).toHaveBeenCalledWith('RefreshToken', {
				token: refreshToken,
				clientId,
				userId,
				expiresAt: expect.any(Number),
			});
		});
	});

	describe('validateAndRotateRefreshToken', () => {
		it('should rotate refresh token and return new token pair in a transaction', async () => {
			const refreshToken = 'old-refresh-token';
			const clientId = 'client-123';
			const refreshTokenRecord = mock<RefreshToken>({
				token: refreshToken,
				clientId,
				userId: 'user-456',
				expiresAt: Date.now() + 1000000, // Valid
			});

			mockTransactionManager.findOne.mockResolvedValue(refreshTokenRecord);
			mockTransactionManager.delete.mockResolvedValue({ affected: 1 });

			const result = await service.validateAndRotateRefreshToken(refreshToken, clientId);

			expect(result).toEqual({
				access_token: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: expect.stringMatching(/^[a-f0-9]{64}$/),
			});

			// Verify transaction was used
			const mockManager = refreshTokenRepository.manager as any;
			expect(mockManager.transaction).toHaveBeenCalled();

			// Verify all operations happened inside the transaction
			expect(mockTransactionManager.findOne).toHaveBeenCalled();
			expect(mockTransactionManager.delete).toHaveBeenCalled();
			expect(mockTransactionManager.insert).toHaveBeenCalledTimes(2);
		});

		it('should honor resource when rotating refresh token', async () => {
			const refreshToken = 'old-refresh-token';
			const clientId = 'client-123';
			const refreshTokenRecord = mock<RefreshToken>({
				token: refreshToken,
				clientId,
				userId: 'user-456',
				expiresAt: Date.now() + 1000000,
			});

			mockTransactionManager.findOne.mockResolvedValue(refreshTokenRecord);
			mockTransactionManager.delete.mockResolvedValue({ affected: 1 });

			const result = await service.validateAndRotateRefreshToken(
				refreshToken,
				clientId,
				'https://n8n.example.com/mcp-server/http',
			);

			const decoded = jwtService.decode(result.access_token);
			expect(decoded.aud).toBe('https://n8n.example.com/mcp-server/http');
		});

		it('should throw error when refresh token not found', async () => {
			mockTransactionManager.findOne.mockResolvedValue(null);

			await expect(
				service.validateAndRotateRefreshToken('invalid-token', 'client-123'),
			).rejects.toThrow('Invalid refresh token');
		});

		it('should throw error when refresh token expired (atomic delete fails)', async () => {
			const refreshTokenRecord = mock<RefreshToken>({
				token: 'expired-token',
				clientId: 'client-123',
				userId: 'user-456',
				expiresAt: Date.now() - 1000, // Expired
			});

			mockTransactionManager.findOne.mockResolvedValue(refreshTokenRecord);
			mockTransactionManager.delete.mockResolvedValue({ affected: 0 }); // Atomic delete fails due to expiry

			await expect(
				service.validateAndRotateRefreshToken('expired-token', 'client-123'),
			).rejects.toThrow('Invalid refresh token');
		});
	});

	describe('verifyAccessToken', () => {
		it('should verify valid access token and return auth info', async () => {
			const userId = 'user-123';
			const clientId = 'client-456';
			const { accessToken } = service.generateTokenPair(userId, clientId);

			const accessTokenRecord = mock<AccessToken>({
				token: accessToken,
				clientId,
				userId,
			});

			accessTokenRepository.findOne.mockResolvedValue(accessTokenRecord);

			const result = await service.verifyAccessToken(accessToken);

			expect(result).toEqual({
				token: accessToken,
				clientId,
				scopes: [],
				extra: {
					userId,
				},
			});
		});

		it('should throw error for invalid JWT signature', async () => {
			const invalidToken = 'invalid.jwt.token';

			await expect(service.verifyAccessToken(invalidToken)).rejects.toThrow(
				'JWT Verification Failed',
			);
		});

		it('should throw error for wrong audience', async () => {
			const wrongAudienceToken = jwtService.sign({
				sub: 'user-123',
				aud: 'wrong-audience', // Matches neither legacy literal nor resource URL
				client_id: 'client-456',
			});

			await expect(service.verifyAccessToken(wrongAudienceToken)).rejects.toThrow(
				'JWT Verification Failed',
			);
		});

		it('should accept tokens with canonical audience when expected audience is provided', async () => {
			const audience = 'https://n8n.example.com/mcp-server/http';
			const canonicalAudienceToken = jwtService.sign({
				sub: 'user-123',
				aud: audience,
				client_id: 'client-456',
			});

			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({
					token: canonicalAudienceToken,
					clientId: 'client-456',
					userId: 'user-123',
				}),
			);

			await expect(service.verifyAccessToken(canonicalAudienceToken, audience)).resolves.toEqual({
				token: canonicalAudienceToken,
				clientId: 'client-456',
				scopes: [],
				extra: {
					userId: 'user-123',
				},
			});
		});

		it('should accept legacy audience when expected audience is provided', async () => {
			const audience = 'https://n8n.example.com/mcp-server/http';
			const legacyAudienceToken = jwtService.sign({
				sub: 'user-123',
				aud: 'mcp-server-api',
				client_id: 'client-456',
			});

			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({
					token: legacyAudienceToken,
					clientId: 'client-456',
					userId: 'user-123',
				}),
			);

			await expect(service.verifyAccessToken(legacyAudienceToken, audience)).resolves.toMatchObject(
				{
					token: legacyAudienceToken,
					clientId: 'client-456',
				},
			);
		});

		it('should accept token whose aud is the legacy literal (backward compat)', async () => {
			const userId = 'user-123';
			const clientId = 'client-456';
			const legacyToken = jwtService.sign({
				sub: userId,
				aud: 'mcp-server-api',
				client_id: clientId,
			});
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: legacyToken, clientId, userId }),
			);

			const result = await service.verifyAccessToken(legacyToken);

			expect(result.extra?.userId).toBe(userId);
			expect(result.clientId).toBe(clientId);
		});

		it('should accept token whose aud is the resource URL', async () => {
			const userId = 'user-123';
			const clientId = 'client-456';
			const urlToken = jwtService.sign({
				sub: userId,
				aud: TEST_RESOURCE_URL,
				client_id: clientId,
			});
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: urlToken, clientId, userId }),
			);

			const result = await service.verifyAccessToken(urlToken);

			expect(result.extra?.userId).toBe(userId);
			expect(result.clientId).toBe(clientId);
		});

		it('should throw error when token not found in database', async () => {
			const userId = 'user-123';
			const clientId = 'client-456';
			const { accessToken } = service.generateTokenPair(userId, clientId);

			accessTokenRepository.findOne.mockResolvedValue(null);

			await expect(service.verifyAccessToken(accessToken)).rejects.toThrow(
				'Access Token Not Found in Database',
			);
		});
	});

	describe('verifyOAuthAccessToken', () => {
		it('should verify token and return user', async () => {
			const userId = 'user-123';
			const clientId = 'client-456';
			const { accessToken } = service.generateTokenPair(userId, clientId);

			const accessTokenRecord = mock<AccessToken>({
				token: accessToken,
				clientId,
				userId,
			});

			const user = mock<User>({ id: userId });

			accessTokenRepository.findOne.mockResolvedValue(accessTokenRecord);
			userRepository.findOne.mockResolvedValue(user);

			const result = await service.verifyOAuthAccessToken(accessToken);

			expect(result).toEqual({ user, authType: 'oauth' });
			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: { id: userId },
				relations: ['role'],
			});
		});

		it('should return null for invalid token', async () => {
			const invalidToken = 'invalid.jwt.token';

			const result = await service.verifyOAuthAccessToken(invalidToken);

			expect(result).toMatchObject({ user: null });
		});

		it('should return null when user not found', async () => {
			const userId = 'user-123';
			const clientId = 'client-456';
			const { accessToken } = service.generateTokenPair(userId, clientId);

			const accessTokenRecord = mock<AccessToken>({
				token: accessToken,
				clientId,
				userId,
			});

			accessTokenRepository.findOne.mockResolvedValue(accessTokenRecord);
			userRepository.findOne.mockResolvedValue(null);

			const result = await service.verifyOAuthAccessToken(accessToken);

			expect(result).toMatchObject({ user: null });
		});
	});

	describe('revokeAccessToken', () => {
		it('should delete access token', async () => {
			const token = 'access-token-123';
			const clientId = 'client-456';

			accessTokenRepository.delete.mockResolvedValue({ affected: 1 } as any);

			const result = await service.revokeAccessToken(token, clientId);

			expect(result).toBe(true);
			expect(accessTokenRepository.delete).toHaveBeenCalledWith({ token, clientId });
			expect(logger.info).toHaveBeenCalledWith('Access token revoked', { clientId });
		});

		it('should return false when token not found', async () => {
			accessTokenRepository.delete.mockResolvedValue({ affected: 0 } as any);

			const result = await service.revokeAccessToken('nonexistent-token', 'client-456');

			expect(result).toBe(false);
		});
	});

	describe('revokeRefreshToken', () => {
		it('should delete refresh token', async () => {
			const token = 'refresh-token-123';
			const clientId = 'client-456';

			refreshTokenRepository.delete.mockResolvedValue({ affected: 1 } as any);

			const result = await service.revokeRefreshToken(token, clientId);

			expect(result).toBe(true);
			expect(refreshTokenRepository.delete).toHaveBeenCalledWith({ token, clientId });
			expect(logger.info).toHaveBeenCalledWith('Refresh token revoked', { clientId });
		});

		it('should return false when token not found', async () => {
			refreshTokenRepository.delete.mockResolvedValue({ affected: 0 } as any);

			const result = await service.revokeRefreshToken('nonexistent-token', 'client-456');

			expect(result).toBe(false);
		});
	});

	describe('getAllowedAudiences', () => {
		it('should return canonical URL and legacy audience when expectedAudience is the canonical URL', async () => {
			const audiences = await (service as any).getAllowedAudiences(
				'https://n8n.example.com/mcp-server/http',
			);
			expect(audiences).toEqual(['https://n8n.example.com/mcp-server/http', 'mcp-server-api']);
		});

		it('should return only canonical URL and legacy audience when expectedAudience is undefined', async () => {
			const audiences = await (service as any).getAllowedAudiences(undefined);
			// Should still return the canonical resource URL (from getCanonicalResourceUrl) and legacy
			expect(audiences).toEqual(['https://n8n.example.com/mcp-server/http', 'mcp-server-api']);
		});
	});

	describe('multi-resource audience isolation', () => {
		const RESOURCE_A_URL = `${TEST_BASE_URL}/mcp-server/http`;
		const RESOURCE_B_URL = `${TEST_BASE_URL}/webhook/wf-1/mcp`;

		let multiResourceService: OAuthTokenService;

		beforeAll(() => {
			const multiResourceRegistry = new ProtectedResourceRegistry(mock<Logger>());
			multiResourceRegistry.register({
				id: 'instance-mcp',
				getResourceUrl: () => RESOURCE_A_URL,
				getAudiences: () => [RESOURCE_A_URL, LEGACY_AUDIENCE],
				scopes: [],
				isDefault: true,
			});
			multiResourceRegistry.register({
				id: 'workflow-trigger',
				getResourceUrl: () => RESOURCE_B_URL,
				getAudiences: () => [RESOURCE_B_URL],
				scopes: [],
			});

			multiResourceService = new OAuthTokenService(
				logger,
				jwtService,
				userRepository,
				accessTokenRepository,
				refreshTokenRepository,
				multiResourceRegistry,
			);
		});

		it('should reject a token whose aud belongs to another resource', async () => {
			const tokenForResourceA = jwtService.sign({
				sub: 'user-123',
				aud: RESOURCE_A_URL,
				client_id: 'client-456',
			});

			await expect(
				multiResourceService.verifyAccessToken(tokenForResourceA, RESOURCE_B_URL),
			).rejects.toThrow('JWT Verification Failed');
		});

		it('should not accept the legacy audience at a non-default resource', async () => {
			const legacyToken = jwtService.sign({
				sub: 'user-123',
				aud: LEGACY_AUDIENCE,
				client_id: 'client-456',
			});

			await expect(
				multiResourceService.verifyAccessToken(legacyToken, RESOURCE_B_URL),
			).rejects.toThrow('JWT Verification Failed');
		});

		it('should accept a token at its own resource', async () => {
			const tokenForResourceB = jwtService.sign({
				sub: 'user-123',
				aud: RESOURCE_B_URL,
				client_id: 'client-456',
			});
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: tokenForResourceB, clientId: 'client-456', userId: 'user-123' }),
			);

			await expect(
				multiResourceService.verifyAccessToken(tokenForResourceB, RESOURCE_B_URL),
			).resolves.toMatchObject({ clientId: 'client-456' });
		});

		it('should still accept the legacy audience at the default (instance MCP) resource', async () => {
			const legacyToken = jwtService.sign({
				sub: 'user-123',
				aud: LEGACY_AUDIENCE,
				client_id: 'client-456',
			});
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: legacyToken, clientId: 'client-456', userId: 'user-123' }),
			);

			await expect(
				multiResourceService.verifyAccessToken(legacyToken, RESOURCE_A_URL),
			).resolves.toMatchObject({ clientId: 'client-456' });
		});
	});
});
