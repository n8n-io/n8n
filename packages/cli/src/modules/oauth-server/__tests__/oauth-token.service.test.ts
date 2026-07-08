import type { Mocked } from 'vitest';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { User } from '@n8n/db';
import { UserRepository } from '@n8n/db';
import { mock } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';

import { JwtService } from '@/services/jwt.service';

import type { AccessToken } from '../database/entities/oauth-access-token.entity';
import type { RefreshToken } from '../database/entities/oauth-refresh-token.entity';
import { AccessTokenRepository } from '../database/repositories/oauth-access-token.repository';
import { RefreshTokenRepository } from '../database/repositories/oauth-refresh-token.repository';
import { UserConsentRepository } from '../database/repositories/oauth-user-consent.repository';
import { OAuthTokenService } from '../oauth-token.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });
const jwtService = new JwtService(instanceSettings, mock());

let logger: Mocked<Logger>;
let userRepository: Mocked<UserRepository>;
let accessTokenRepository: Mocked<AccessTokenRepository>;
let refreshTokenRepository: Mocked<RefreshTokenRepository>;
let userConsentRepository: Mocked<UserConsentRepository>;
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
	authorize: async () => true,
});

describe('OAuthTokenService', () => {
	beforeAll(() => {
		logger = mockInstance(Logger);
		userRepository = mockInstance(UserRepository);
		accessTokenRepository = mockInstance(AccessTokenRepository) as Mocked<AccessTokenRepository>;
		refreshTokenRepository = mockInstance(RefreshTokenRepository) as Mocked<RefreshTokenRepository>;
		userConsentRepository = mockInstance(UserConsentRepository) as Mocked<UserConsentRepository>;

		mockTransactionManager = {
			insert: vi.fn().mockResolvedValue(mock()),
			remove: vi.fn().mockResolvedValue(mock()),
			findOne: vi.fn(),
			delete: vi.fn(),
		};

		const mockManager: any = {
			transaction: vi.fn(async (cb: any) => await cb(mockTransactionManager)),
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
			userConsentRepository,
			registry,
		);
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('generateTokenPair', () => {
		it('should generate JWT access token and opaque refresh token', () => {
			const userId = 'user-123';
			const clientId = 'client-456';

			const { accessToken, refreshToken } = service.generateTokenPair(
				userId,
				clientId,
				undefined,
				[],
			);

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
				[],
			);

			const decoded = jwtService.decode(accessToken);
			expect(decoded.aud).toBe('https://n8n.example.com/mcp-server/http');
		});

		it('should mint a space-delimited scope claim', () => {
			const { accessToken } = service.generateTokenPair('user-123', 'client-456', undefined, [
				'workflow:read',
				'execution:read',
			]);

			const decoded = jwtService.decode(accessToken);
			expect(decoded.scope).toBe('workflow:read execution:read');
		});

		it('should mint an empty scope claim for scope-less grants', () => {
			const { accessToken } = service.generateTokenPair('user-123', 'client-456', undefined, []);

			const decoded = jwtService.decode(accessToken);
			expect(decoded.scope).toBe('');
		});

		it('should generate different tokens on each call', () => {
			const userId = 'user-123';
			const clientId = 'client-456';

			const pair1 = service.generateTokenPair(userId, clientId, undefined, []);
			const pair2 = service.generateTokenPair(userId, clientId, undefined, []);

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

			await service.saveTokenPair(accessToken, refreshToken, clientId, userId, ['workflow:read']);

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
				scope: ['workflow:read'],
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
				scope: [],
			});

			mockTransactionManager.findOne.mockResolvedValue(refreshTokenRecord);
			mockTransactionManager.delete.mockResolvedValue({ affected: 1 });

			const result = await service.validateAndRotateRefreshToken(refreshToken, clientId);

			expect(result).toEqual({
				access_token: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: expect.stringMatching(/^[a-f0-9]{64}$/),
				scope: '',
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
				scope: [],
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

		it('should carry the stored scopes into the new token pair', async () => {
			const refreshToken = 'old-refresh-token';
			const clientId = 'client-123';
			// plain object: vitest-mock-extended wraps array overrides in proxies,
			// which breaks the equality assertion on the inserted `scope`
			const refreshTokenRecord = {
				token: refreshToken,
				clientId,
				userId: 'user-456',
				expiresAt: Date.now() + 1000000,
				scope: ['workflow:read', 'execution:read'],
			} as RefreshToken;

			mockTransactionManager.findOne.mockResolvedValue(refreshTokenRecord);
			mockTransactionManager.delete.mockResolvedValue({ affected: 1 });

			const result = await service.validateAndRotateRefreshToken(refreshToken, clientId);

			expect(result.scope).toBe('workflow:read execution:read');
			expect(jwtService.decode(result.access_token).scope).toBe('workflow:read execution:read');
			expect(mockTransactionManager.insert).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ scope: ['workflow:read', 'execution:read'] }),
			);
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
			const { accessToken } = service.generateTokenPair(userId, clientId, undefined, []);

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
			const { accessToken } = service.generateTokenPair(userId, clientId, undefined, []);

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
			const { accessToken } = service.generateTokenPair(userId, clientId, undefined, []);

			const accessTokenRecord = mock<AccessToken>({
				token: accessToken,
				clientId,
				userId,
			});

			const user = mock<User>({ id: userId });

			accessTokenRepository.findOne.mockResolvedValue(accessTokenRecord);
			userRepository.findOne.mockResolvedValue(user);

			const result = await service.verifyOAuthAccessToken(accessToken);

			expect(result).toEqual({ user, authType: 'oauth', scopes: [], clientId });
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
			const { accessToken } = service.generateTokenPair(userId, clientId, undefined, []);

			const accessTokenRecord = mock<AccessToken>({
				token: accessToken,
				clientId,
				userId,
			});

			accessTokenRepository.findOne.mockResolvedValue(accessTokenRecord);
			userRepository.findOne.mockResolvedValue(null);

			const result = await service.verifyOAuthAccessToken(accessToken);

			expect(result).toMatchObject({ user: null });
			expect(userConsentRepository.update).not.toHaveBeenCalled();
		});

		it('should not record activity on verification alone', async () => {
			const userId = 'user-activity';
			const clientId = 'client-activity';
			const { accessToken } = service.generateTokenPair(userId, clientId, undefined, []);

			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: accessToken, clientId, userId }),
			);
			userRepository.findOne.mockResolvedValue(mock<User>({ id: userId }));

			await service.verifyOAuthAccessToken(accessToken);

			expect(userConsentRepository.update).not.toHaveBeenCalled();
		});
	});

	describe('recordClientActivity', () => {
		it('should update the consent lastActiveAt', () => {
			service.recordClientActivity('user-record', 'client-record');

			expect(userConsentRepository.update).toHaveBeenCalledWith(
				{ userId: 'user-record', clientId: 'client-record' },
				{ lastActiveAt: expect.any(Number) },
			);
		});

		it('should throttle writes for the same user and client', () => {
			service.recordClientActivity('user-throttled', 'client-throttled');
			service.recordClientActivity('user-throttled', 'client-throttled');

			expect(userConsentRepository.update).toHaveBeenCalledTimes(1);
		});

		it('should deny when a resource-scoped audience cannot be resolved', async () => {
			// Fail closed: the token carries an audience but no resource resolves for
			// it (deleted, or a transient resolver failure the registry swallows), so
			// the authorize gate cannot run and the token must be rejected.
			const { accessToken } = service.generateTokenPair('user-123', 'client-456', undefined, []);

			const result = await service.verifyOAuthAccessToken(
				accessToken,
				'https://unregistered.example.com/mcp',
			);

			expect(result.user).toBeNull();
			expect(result.context?.reason).toBe('insufficient_scope');
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
				authorize: async () => true,
				isDefault: true,
			});
			multiResourceRegistry.register({
				id: 'workflow-trigger',
				getResourceUrl: () => RESOURCE_B_URL,
				getAudiences: () => [RESOURCE_B_URL],
				authorize: async () => true,
				scopes: [],
			});

			multiResourceService = new OAuthTokenService(
				logger,
				jwtService,
				userRepository,
				accessTokenRepository,
				refreshTokenRepository,
				userConsentRepository,
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

	describe('scope handling for pre-scoping grants', () => {
		const RESOURCE_SCOPES = ['workflow:read', 'workflow:write', 'execution:read'];

		let scopedService: OAuthTokenService;

		beforeAll(() => {
			const scopedRegistry = new ProtectedResourceRegistry(mock<Logger>());
			scopedRegistry.register({
				id: 'instance-mcp',
				getResourceUrl: () => TEST_RESOURCE_URL,
				getAudiences: () => [TEST_RESOURCE_URL, LEGACY_AUDIENCE],
				scopes: RESOURCE_SCOPES,
				isDefault: true,
				authorize: async () => true,
			});

			scopedService = new OAuthTokenService(
				logger,
				jwtService,
				userRepository,
				accessTokenRepository,
				refreshTokenRepository,
				userConsentRepository,
				scopedRegistry,
			);
		});

		it('substitutes the migration sentinel with the frozen launch scope set on rotation', async () => {
			const refreshTokenRecord = {
				token: 'legacy-refresh-token',
				clientId: 'client-123',
				userId: 'user-456',
				expiresAt: Date.now() + 1000000,
				scope: ['tool:listWorkflows', 'tool:getWorkflowDetails'],
			} as RefreshToken;

			mockTransactionManager.findOne.mockResolvedValue(refreshTokenRecord);
			mockTransactionManager.delete.mockResolvedValue({ affected: 1 });

			const result = await scopedService.validateAndRotateRefreshToken(
				'legacy-refresh-token',
				'client-123',
			);

			expect(result.scope).toBe(RESOURCE_SCOPES.join(' '));
			expect(mockTransactionManager.insert).toHaveBeenCalledWith(
				expect.anything(),
				expect.objectContaining({ scope: RESOURCE_SCOPES }),
			);
		});

		it('does not grandfather scopes added after scoping shipped', async () => {
			// a future release registers a scope that did not exist at launch
			const futureRegistry = new ProtectedResourceRegistry(mock<Logger>());
			futureRegistry.register({
				id: 'instance-mcp',
				getResourceUrl: () => TEST_RESOURCE_URL,
				getAudiences: () => [TEST_RESOURCE_URL, LEGACY_AUDIENCE],
				scopes: [...RESOURCE_SCOPES, 'variable:read'],
				isDefault: true,
				authorize: async () => true,
			});
			const futureService = new OAuthTokenService(
				logger,
				jwtService,
				userRepository,
				accessTokenRepository,
				refreshTokenRepository,
				futureRegistry,
			);

			const refreshTokenRecord = {
				token: 'legacy-refresh-token',
				clientId: 'client-123',
				userId: 'user-456',
				expiresAt: Date.now() + 1000000,
				scope: ['tool:listWorkflows', 'tool:getWorkflowDetails'],
			} as RefreshToken;

			mockTransactionManager.findOne.mockResolvedValue(refreshTokenRecord);
			mockTransactionManager.delete.mockResolvedValue({ affected: 1 });

			const result = await futureService.validateAndRotateRefreshToken(
				'legacy-refresh-token',
				'client-123',
			);

			// pre-scoping grants stay capped at the launch set; the new scope
			// requires a fresh consent
			expect(result.scope).toBe(RESOURCE_SCOPES.join(' '));
			expect(result.scope).not.toContain('variable:read');
		});

		it('does not substitute an explicit grant that differs from the sentinel', async () => {
			const refreshTokenRecord = {
				token: 'scoped-refresh-token',
				clientId: 'client-123',
				userId: 'user-456',
				expiresAt: Date.now() + 1000000,
				scope: ['workflow:read'],
			} as RefreshToken;

			mockTransactionManager.findOne.mockResolvedValue(refreshTokenRecord);
			mockTransactionManager.delete.mockResolvedValue({ affected: 1 });

			const result = await scopedService.validateAndRotateRefreshToken(
				'scoped-refresh-token',
				'client-123',
			);

			expect(result.scope).toBe('workflow:read');
		});

		it('grandfathers a token without a scope claim to the resource full scope set', async () => {
			const legacyToken = jwtService.sign({
				sub: 'user-123',
				aud: TEST_RESOURCE_URL,
				client_id: 'client-456',
			});
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: legacyToken, clientId: 'client-456', userId: 'user-123' }),
			);

			const result = await scopedService.verifyAccessToken(legacyToken);

			expect(result.scopes).toEqual(RESOURCE_SCOPES);
		});

		it('parses the scope claim of a scoped token', async () => {
			const { accessToken } = scopedService.generateTokenPair('user-123', 'client-456', undefined, [
				'workflow:read',
			]);
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: accessToken, clientId: 'client-456', userId: 'user-123' }),
			);

			const result = await scopedService.verifyAccessToken(accessToken);

			expect(result.scopes).toEqual(['workflow:read']);
		});

		it('treats an empty scope claim as no scopes', async () => {
			const { accessToken } = scopedService.generateTokenPair(
				'user-123',
				'client-456',
				undefined,
				[],
			);
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: accessToken, clientId: 'client-456', userId: 'user-123' }),
			);

			const result = await scopedService.verifyAccessToken(accessToken);

			expect(result.scopes).toEqual([]);
		});

		it('returns the token scopes from verifyOAuthAccessToken', async () => {
			const { accessToken } = scopedService.generateTokenPair('user-123', 'client-456', undefined, [
				'workflow:read',
			]);
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: accessToken, clientId: 'client-456', userId: 'user-123' }),
			);
			userRepository.findOne.mockResolvedValue(mock<User>({ id: 'user-123' }));

			const result = await scopedService.verifyOAuthAccessToken(accessToken);

			expect(result.scopes).toEqual(['workflow:read']);
		});
	});
});
