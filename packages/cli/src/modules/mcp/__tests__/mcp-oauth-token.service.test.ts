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
import { McpOAuthTokenService } from '../mcp-oauth-token.service';

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });
const jwtService = new JwtService(instanceSettings, mock());

let logger: jest.Mocked<Logger>;
let userRepository: jest.Mocked<UserRepository>;
let accessTokenRepository: jest.Mocked<AccessTokenRepository>;
let refreshTokenRepository: jest.Mocked<RefreshTokenRepository>;
let service: McpOAuthTokenService;
let mockTransactionManager: any;

describe('McpOAuthTokenService', () => {
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

		service = new McpOAuthTokenService(
			logger,
			jwtService,
			userRepository,
			accessTokenRepository,
			refreshTokenRepository,
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
			expect(decoded.aud).toBe('mcp-server-api');
			expect(decoded.client_id).toBe(clientId);
			expect(decoded.meta.isOAuth).toBe(true);
			expect(decoded.jti).toBeDefined();
			expect(decoded.iat).toBeDefined();
			expect(decoded.exp).toBeDefined();

			expect(refreshToken).toHaveLength(64); // 32 bytes hex = 64 characters
			expect(refreshToken).toMatch(/^[a-f0-9]{64}$/);
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
				aud: 'wrong-audience', // Not 'mcp-server-api'
				client_id: 'client-456',
			});

			await expect(service.verifyAccessToken(wrongAudienceToken)).rejects.toThrow(
				'JWT Verification Failed',
			);
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

			expect(result).toEqual({ user });
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
});
