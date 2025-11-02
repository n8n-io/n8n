import { mockInstance } from '@n8n/backend-test-utils';
import { Logger } from '@n8n/backend-common';
import type { User, AccessToken, RefreshToken } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { JwtService } from '@/services/jwt.service';

import { AccessTokenRepository } from '../oauth-access-token.repository';
import { McpOAuthTokenService } from '../mcp-oauth-token.service';
import { RefreshTokenRepository } from '../oauth-refresh-token.repository';

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

		// Mock the transaction manager
		mockTransactionManager = {
			save: jest.fn().mockResolvedValue(mock()),
		};

		// Mock the manager with transaction support
		const mockManager: any = {
			transaction: jest.fn(async (cb: any) => await cb(mockTransactionManager)),
		};

		// Assign manager and target properties
		(accessTokenRepository as any).manager = mockManager;
		(accessTokenRepository as any).target = 'AccessToken';
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

			// Access token should be a JWT
			expect(accessToken).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/); // JWT format

			// Verify JWT claims
			const decoded = jwtService.decode(accessToken) as any;
			expect(decoded.sub).toBe(userId);
			expect(decoded.aud).toBe('mcp-server-api');
			expect(decoded.client_id).toBe(clientId);
			expect(decoded.meta.isOAuth).toBe(true);
			expect(decoded.jti).toBeDefined();
			expect(decoded.iat).toBeDefined();
			expect(decoded.exp).toBeDefined();

			// Refresh token should be opaque (hex string)
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
			expect(mockTransactionManager.save).toHaveBeenCalledTimes(2);

			// Check access token save
			expect(mockTransactionManager.save).toHaveBeenCalledWith('AccessToken', {
				token: accessToken,
				clientId,
				userId,
				revoked: false,
			});

			// Check refresh token save
			expect(mockTransactionManager.save).toHaveBeenCalledWith('RefreshToken', {
				token: refreshToken,
				clientId,
				userId,
				expiresAt: expect.any(Number),
			});
		});
	});

	describe('validateAndRotateRefreshToken', () => {
		it('should rotate refresh token and return new token pair', async () => {
			const refreshToken = 'old-refresh-token';
			const clientId = 'client-123';
			const refreshTokenRecord = mock<RefreshToken>({
				token: refreshToken,
				clientId,
				userId: 'user-456',
				expiresAt: Date.now() + 1000000, // Valid
			});

			refreshTokenRepository.findOne.mockResolvedValue(refreshTokenRecord);
			refreshTokenRepository.remove.mockResolvedValue(refreshTokenRecord);

			const result = await service.validateAndRotateRefreshToken(refreshToken, clientId);

			expect(result).toEqual({
				access_token: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: expect.stringMatching(/^[a-f0-9]{64}$/),
			});

			// Old refresh token should be removed
			expect(refreshTokenRepository.remove).toHaveBeenCalledWith(refreshTokenRecord);

			// New token pair should be saved
			const mockManager = accessTokenRepository.manager as any;
			expect(mockManager.transaction).toHaveBeenCalled();
		});

		it('should throw error when refresh token not found', async () => {
			refreshTokenRepository.findOne.mockResolvedValue(null);

			await expect(
				service.validateAndRotateRefreshToken('invalid-token', 'client-123'),
			).rejects.toThrow('Invalid refresh token');
		});

		it('should throw error and remove when refresh token expired', async () => {
			const refreshTokenRecord = mock<RefreshToken>({
				token: 'expired-token',
				clientId: 'client-123',
				userId: 'user-456',
				expiresAt: Date.now() - 1000, // Expired
			});

			refreshTokenRepository.findOne.mockResolvedValue(refreshTokenRecord);
			refreshTokenRepository.remove.mockResolvedValue(refreshTokenRecord);

			await expect(
				service.validateAndRotateRefreshToken('expired-token', 'client-123'),
			).rejects.toThrow('Refresh token expired');

			expect(refreshTokenRepository.remove).toHaveBeenCalledWith(refreshTokenRecord);
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
				revoked: false,
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
				'Invalid access token: JWT verification failed',
			);
		});

		it('should throw error for wrong audience', async () => {
			// Create a JWT with wrong audience
			const wrongAudienceToken = jwtService.sign({
				sub: 'user-123',
				aud: 'wrong-audience', // Not 'mcp-server-api'
				client_id: 'client-456',
			});

			await expect(service.verifyAccessToken(wrongAudienceToken)).rejects.toThrow(
				'Invalid token audience',
			);
		});

		it('should throw error when token not found in database', async () => {
			const userId = 'user-123';
			const clientId = 'client-456';
			const { accessToken } = service.generateTokenPair(userId, clientId);

			accessTokenRepository.findOne.mockResolvedValue(null);

			await expect(service.verifyAccessToken(accessToken)).rejects.toThrow(
				'Invalid access token: not found in database',
			);
		});

		it('should throw error when token is revoked', async () => {
			const userId = 'user-123';
			const clientId = 'client-456';
			const { accessToken } = service.generateTokenPair(userId, clientId);

			const revokedTokenRecord = mock<AccessToken>({
				token: accessToken,
				clientId,
				userId,
				revoked: true, // Revoked
			});

			accessTokenRepository.findOne.mockResolvedValue(revokedTokenRecord);

			await expect(service.verifyAccessToken(accessToken)).rejects.toThrow(
				'Access token has been revoked',
			);
		});
	});

	describe('verifyOAuthToken', () => {
		it('should verify token and return user', async () => {
			const userId = 'user-123';
			const clientId = 'client-456';
			const { accessToken } = service.generateTokenPair(userId, clientId);

			const accessTokenRecord = mock<AccessToken>({
				token: accessToken,
				clientId,
				userId,
				revoked: false,
			});

			const user = mock<User>({ id: userId });

			accessTokenRepository.findOne.mockResolvedValue(accessTokenRecord);
			userRepository.findOne.mockResolvedValue(user);

			const result = await service.verifyOAuthToken(accessToken);

			expect(result).toEqual(user);
			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: { id: userId },
				relations: ['role'],
			});
		});

		it('should return null for invalid token', async () => {
			const invalidToken = 'invalid.jwt.token';

			const result = await service.verifyOAuthToken(invalidToken);

			expect(result).toBeNull();
		});

		it('should return null when user not found', async () => {
			const userId = 'user-123';
			const clientId = 'client-456';
			const { accessToken } = service.generateTokenPair(userId, clientId);

			const accessTokenRecord = mock<AccessToken>({
				token: accessToken,
				clientId,
				userId,
				revoked: false,
			});

			accessTokenRepository.findOne.mockResolvedValue(accessTokenRecord);
			userRepository.findOne.mockResolvedValue(null);

			const result = await service.verifyOAuthToken(accessToken);

			expect(result).toBeNull();
		});
	});

	describe('revokeAccessToken', () => {
		it('should mark access token as revoked', async () => {
			const token = 'access-token-123';
			const clientId = 'client-456';
			const accessTokenRecord = mock<AccessToken>({
				token,
				clientId,
				userId: 'user-123',
				revoked: false,
			});

			accessTokenRepository.findOne.mockResolvedValue(accessTokenRecord);
			accessTokenRepository.save.mockResolvedValue(accessTokenRecord);

			const result = await service.revokeAccessToken(token, clientId);

			expect(result).toBe(true);
			expect(accessTokenRecord.revoked).toBe(true);
			expect(accessTokenRepository.save).toHaveBeenCalledWith(accessTokenRecord);
			expect(logger.info).toHaveBeenCalledWith('Access token revoked', {
				clientId,
				userId: 'user-123',
			});
		});

		it('should return false when token not found', async () => {
			accessTokenRepository.findOne.mockResolvedValue(null);

			const result = await service.revokeAccessToken('nonexistent-token', 'client-456');

			expect(result).toBe(false);
			expect(accessTokenRepository.save).not.toHaveBeenCalled();
		});
	});

	describe('revokeRefreshToken', () => {
		it('should delete refresh token', async () => {
			const token = 'refresh-token-123';
			const clientId = 'client-456';
			const refreshTokenRecord = mock<RefreshToken>({
				token,
				clientId,
				userId: 'user-123',
			});

			refreshTokenRepository.findOne.mockResolvedValue(refreshTokenRecord);
			refreshTokenRepository.remove.mockResolvedValue(refreshTokenRecord);

			const result = await service.revokeRefreshToken(token, clientId);

			expect(result).toBe(true);
			expect(refreshTokenRepository.remove).toHaveBeenCalledWith(refreshTokenRecord);
			expect(logger.info).toHaveBeenCalledWith('Refresh token revoked', {
				clientId,
				userId: 'user-123',
			});
		});

		it('should return false when token not found', async () => {
			refreshTokenRepository.findOne.mockResolvedValue(null);

			const result = await service.revokeRefreshToken('nonexistent-token', 'client-456');

			expect(result).toBe(false);
			expect(refreshTokenRepository.remove).not.toHaveBeenCalled();
		});
	});
});
