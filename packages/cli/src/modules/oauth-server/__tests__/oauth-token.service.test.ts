import { InvalidTargetError } from '@modelcontextprotocol/sdk/server/auth/errors.js';
import type { Mocked } from 'vitest';
import jwt from 'jsonwebtoken';
import { Logger, type LicenseState, type ModuleRegistry } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import type { GlobalConfig } from '@n8n/config';
import type { DeploymentKey, OperationContext, TransactionRunner, User } from '@n8n/db';
import { OAUTH_JWE_PRIVATE_KEY_TYPE, UserRepository } from '@n8n/db';
import { mock, type MockProxy } from 'vitest-mock-extended';
import type { InstanceSettings } from 'n8n-core';
import type { KeyObject } from 'node:crypto';
import { createHmac, createPublicKey, generateKeyPairSync } from 'node:crypto';

import { JwtService, type PurposedSignOptions } from '@/services/jwt.service';

import type { AccessToken } from '../database/entities/oauth-access-token.entity';
import type { RefreshToken } from '../database/entities/oauth-refresh-token.entity';
import { AccessTokenRepository } from '../database/repositories/oauth-access-token.repository';
import { RefreshTokenRepository } from '../database/repositories/oauth-refresh-token.repository';
import { OAUTH_ACCESS_TOKEN_TTL_SECONDS } from '../oauth-signing-key.constants';
import { OAuthTokenService } from '../oauth-token.service';
import { JWTVerificationError } from '../oauth.errors';
import {
	createSigningKeyService,
	es256Signer,
	forgeJwt,
	readStoredPrivateKey,
	rs256Signer,
} from './signing-key-fixtures';
import { McpProtectedResource } from '@/modules/mcp/mcp-protected-resource';
import type { McpConfig } from '@/modules/mcp/mcp.config';
import type { McpSettingsService } from '@/modules/mcp/mcp.settings.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';
import type { UrlService } from '@n8n/backend-services';
import type { WorkflowFinderService } from '@/workflows/workflow-finder.service';

const instanceSettings = mock<InstanceSettings>({ encryptionKey: 'test-key' });
const jwtService = new JwtService(instanceSettings, mock(), mock());

let logger: Mocked<Logger>;
let userRepository: Mocked<UserRepository>;
let accessTokenRepository: Mocked<AccessTokenRepository>;
let refreshTokenRepository: Mocked<RefreshTokenRepository>;
let urlService: MockProxy<UrlService>;
let service: OAuthTokenService;
let txRunner: MockProxy<TransactionRunner>;
const workflowFinderService = mock<WorkflowFinderService>();
const signingKeys = createSigningKeyService();
const signingKeyService = signingKeys.service;

const TEST_BASE_URL = 'https://n8n.example.com';
const TEST_RESOURCE_URL = `${TEST_BASE_URL}/mcp-server/http`;
const LEGACY_AUDIENCE = 'mcp-server-api';
const OTHER_RESOURCE_URL = `${TEST_BASE_URL}/mcp/workflow-b`;

const registry = new ProtectedResourceRegistry(mock<Logger>());
registry.register({
	surface: 'instance-mcp',
	id: 'instance-mcp',
	getResourceUrl: () => TEST_RESOURCE_URL,
	getAudiences: () => [TEST_RESOURCE_URL, LEGACY_AUDIENCE],
	scopes: [],
	isDefault: true,
	authorize: async () => true,
});

describe('OAuthTokenService', () => {
	beforeAll(async () => {
		await signingKeyService.initialize();

		logger = mockInstance(Logger);
		userRepository = mockInstance(UserRepository);
		accessTokenRepository = mockInstance(AccessTokenRepository) as Mocked<AccessTokenRepository>;
		refreshTokenRepository = mockInstance(RefreshTokenRepository) as Mocked<RefreshTokenRepository>;
		urlService = mock<UrlService>();
		urlService.getInstanceBaseUrl.mockReturnValue(TEST_BASE_URL);

		// The runner just invokes the work with the (root) context — repositories are mocked,
		// so no real transaction is opened.
		txRunner = mock<TransactionRunner>();
		txRunner.run.mockImplementation(
			async <T>(ctx: OperationContext, fn: (ctx: OperationContext) => Promise<T>) => await fn(ctx),
		);

		service = new OAuthTokenService(
			logger,
			jwtService,
			userRepository,
			accessTokenRepository,
			refreshTokenRepository,
			registry,
			txRunner,
			workflowFinderService,
			urlService,
			signingKeyService,
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

			const decoded = jwtService.decodeUnverified(accessToken);
			expect(decoded.iss).toBe(TEST_BASE_URL);
			expect(decoded.sub).toBe(userId);
			expect(decoded.aud).toBe(TEST_RESOURCE_URL);
			expect(decoded.client_id).toBe(clientId);
			expect(decoded.meta.isOAuth).toBe(true);
			expect(decoded.jti).toBeDefined();
			expect(decoded.iat).toBeDefined();
			expect(decoded.exp).toBeDefined();

			const fullToken = jwt.decode(accessToken, { complete: true });
			expect(fullToken?.header).toEqual({
				alg: 'ES256',
				typ: 'at+jwt',
				kid: signingKeys.keyStore.rows[0].id,
			});

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

			const decoded = jwtService.decodeUnverified(accessToken);
			expect(decoded.aud).toBe('https://n8n.example.com/mcp-server/http');
		});

		it('should mint a space-delimited scope claim', () => {
			const { accessToken } = service.generateTokenPair('user-123', 'client-456', undefined, [
				'workflow:read',
				'execution:read',
			]);

			const decoded = jwtService.decodeUnverified(accessToken);
			expect(decoded.scope).toBe('workflow:read execution:read');
		});

		it('should mint an empty scope claim for scope-less grants', () => {
			const { accessToken } = service.generateTokenPair('user-123', 'client-456', undefined, []);

			const decoded = jwtService.decodeUnverified(accessToken);
			expect(decoded.scope).toBe('');
		});

		it('should return the resolved audience so the grant can be persisted', () => {
			const withResource = service.generateTokenPair(
				'user-123',
				'client-456',
				OTHER_RESOURCE_URL,
				[],
			);
			expect(withResource.audience).toBe(OTHER_RESOURCE_URL);

			// Resource-less grants resolve to the default resource, so the returned
			// audience is always a concrete URL.
			const withoutResource = service.generateTokenPair('user-123', 'client-456', undefined, []);
			expect(withoutResource.audience).toBe(TEST_RESOURCE_URL);
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

			await service.saveTokenPair(
				accessToken,
				refreshToken,
				clientId,
				userId,
				['workflow:read'],
				TEST_RESOURCE_URL,
			);

			expect(txRunner.run).toHaveBeenCalled();

			expect(accessTokenRepository.insertToken).toHaveBeenCalledWith(
				{ token: accessToken, clientId, userId },
				expect.anything(),
			);

			expect(refreshTokenRepository.insertToken).toHaveBeenCalledWith(
				{
					token: refreshToken,
					clientId,
					userId,
					expiresAt: expect.any(Number),
					scope: ['workflow:read'],
					resource: TEST_RESOURCE_URL,
				},
				expect.anything(),
			);
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
				resource: TEST_RESOURCE_URL,
			});

			refreshTokenRepository.findByToken.mockResolvedValue(refreshTokenRecord);
			refreshTokenRepository.deleteValidByToken.mockResolvedValue(1);

			const result = await service.validateAndRotateRefreshToken(refreshToken, clientId);

			expect(result).toEqual({
				access_token: expect.stringMatching(/^[\w-]+\.[\w-]+\.[\w-]+$/),
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: expect.stringMatching(/^[a-f0-9]{64}$/),
				scope: '',
			});

			// The work ran through the runner, and all operations went through the repositories.
			expect(txRunner.run).toHaveBeenCalled();
			expect(refreshTokenRepository.findByToken).toHaveBeenCalled();
			expect(refreshTokenRepository.deleteValidByToken).toHaveBeenCalled();
			expect(accessTokenRepository.insertToken).toHaveBeenCalledTimes(1);
			expect(refreshTokenRepository.insertToken).toHaveBeenCalledTimes(1);
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
				resource: TEST_RESOURCE_URL,
			});

			refreshTokenRepository.findByToken.mockResolvedValue(refreshTokenRecord);
			refreshTokenRepository.deleteValidByToken.mockResolvedValue(1);

			const result = await service.validateAndRotateRefreshToken(
				refreshToken,
				clientId,
				'https://n8n.example.com/mcp-server/http',
			);

			const decoded = jwtService.decodeUnverified(result.access_token);
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
				resource: TEST_RESOURCE_URL,
			} as RefreshToken;

			refreshTokenRepository.findByToken.mockResolvedValue(refreshTokenRecord);
			refreshTokenRepository.deleteValidByToken.mockResolvedValue(1);

			const result = await service.validateAndRotateRefreshToken(refreshToken, clientId);

			expect(result.scope).toBe('workflow:read execution:read');
			expect(jwtService.decodeUnverified(result.access_token).scope).toBe(
				'workflow:read execution:read',
			);
			expect(refreshTokenRepository.insertToken).toHaveBeenCalledWith(
				expect.objectContaining({ scope: ['workflow:read', 'execution:read'] }),
				expect.anything(),
			);
		});

		it('should throw error when refresh token not found', async () => {
			refreshTokenRepository.findByToken.mockResolvedValue(null);

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

			refreshTokenRepository.findByToken.mockResolvedValue(refreshTokenRecord);
			refreshTokenRepository.deleteValidByToken.mockResolvedValue(0); // Atomic delete fails due to expiry

			await expect(
				service.validateAndRotateRefreshToken('expired-token', 'client-123'),
			).rejects.toThrow('Invalid refresh token');
		});
	});

	describe('refresh-token resource binding', () => {
		const GRANTED_URL = `${TEST_BASE_URL}/mcp/granted`;
		// Second URL the same resource is reachable by, e.g. through the instance hostname.
		const GRANTED_ALIAS_URL = 'https://alias.example.com/mcp/granted';
		const ANOTHER_URL = `${TEST_BASE_URL}/mcp/another`;
		const REFRESH_TOKEN = 'stored-refresh-token';
		const CLIENT_ID = 'client-123';

		let boundService: OAuthTokenService;

		beforeAll(() => {
			const boundRegistry = new ProtectedResourceRegistry(mock<Logger>());
			boundRegistry.register({
				surface: 'instance-mcp',
				id: 'instance-mcp',
				getResourceUrl: () => TEST_RESOURCE_URL,
				getAudiences: () => [TEST_RESOURCE_URL, LEGACY_AUDIENCE],
				scopes: [],
				isDefault: true,
				authorize: async () => true,
			});
			boundRegistry.register({
				surface: 'instance-mcp',
				id: 'granted-resource',
				getResourceUrl: () => GRANTED_URL,
				getResourceUrls: () => [GRANTED_URL, GRANTED_ALIAS_URL],
				getAudiences: () => [GRANTED_URL, GRANTED_ALIAS_URL],
				scopes: [],
				authorize: async () => true,
			});
			boundRegistry.register({
				surface: 'instance-mcp',
				id: 'another-resource',
				getResourceUrl: () => ANOTHER_URL,
				getAudiences: () => [ANOTHER_URL],
				scopes: [],
				authorize: async () => true,
			});

			boundService = new OAuthTokenService(
				logger,
				jwtService,
				userRepository,
				accessTokenRepository,
				refreshTokenRepository,
				boundRegistry,
				txRunner,
				workflowFinderService,
				urlService,
				signingKeyService,
			);
		});

		beforeEach(() => {
			refreshTokenRepository.findByToken.mockResolvedValue({
				token: REFRESH_TOKEN,
				clientId: CLIENT_ID,
				userId: 'user-456',
				expiresAt: Date.now() + 1000000,
				scope: [] as string[],
				resource: GRANTED_URL,
			} as RefreshToken);
			refreshTokenRepository.deleteValidByToken.mockResolvedValue(1);
		});

		it('reuses the granted resource when the request names none', async () => {
			const result = await boundService.validateAndRotateRefreshToken(REFRESH_TOKEN, CLIENT_ID);

			// Not the default resource, which is what a resource-less mint would fall back to.
			expect(jwtService.decodeUnverified(result.access_token).aud).toBe(GRANTED_URL);
		});

		it('accepts a request naming the granted resource', async () => {
			const result = await boundService.validateAndRotateRefreshToken(
				REFRESH_TOKEN,
				CLIENT_ID,
				GRANTED_URL,
			);

			expect(jwtService.decodeUnverified(result.access_token).aud).toBe(GRANTED_URL);
		});

		it('accepts an equivalent spelling of the granted resource', async () => {
			const result = await boundService.validateAndRotateRefreshToken(
				REFRESH_TOKEN,
				CLIENT_ID,
				GRANTED_ALIAS_URL,
			);

			// Minted from the stored spelling, which the resource also accepts.
			expect(jwtService.decodeUnverified(result.access_token).aud).toBe(GRANTED_URL);
		});

		it('rejects a request naming a different resource, leaving the token usable', async () => {
			await expect(
				boundService.validateAndRotateRefreshToken(REFRESH_TOKEN, CLIENT_ID, ANOTHER_URL),
			).rejects.toThrow(InvalidTargetError);

			expect(refreshTokenRepository.deleteValidByToken).not.toHaveBeenCalled();
			expect(refreshTokenRepository.insertToken).not.toHaveBeenCalled();
			expect(accessTokenRepository.insertToken).not.toHaveBeenCalled();
		});

		it('rejects a request naming the default resource for a grant made elsewhere', async () => {
			await expect(
				boundService.validateAndRotateRefreshToken(REFRESH_TOKEN, CLIENT_ID, TEST_RESOURCE_URL),
			).rejects.toThrow(InvalidTargetError);
		});

		it('carries the granted resource onto the rotated refresh token', async () => {
			await boundService.validateAndRotateRefreshToken(REFRESH_TOKEN, CLIENT_ID, GRANTED_ALIAS_URL);

			expect(refreshTokenRepository.insertToken).toHaveBeenCalledWith(
				expect.objectContaining({ resource: GRANTED_URL }),
				expect.anything(),
			);
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
			const wrongAudienceToken = jwtService.signForResource(
				{ sub: 'user-123', client_id: 'client-456' },
				'wrong-audience',
			); // Matches neither legacy literal nor resource URL;

			await expect(service.verifyAccessToken(wrongAudienceToken)).rejects.toThrow(
				'JWT Verification Failed',
			);
		});

		it('should accept tokens with canonical audience when expected audience is provided', async () => {
			const audience = 'https://n8n.example.com/mcp-server/http';
			const canonicalAudienceToken = jwtService.signForResource(
				{ sub: 'user-123', client_id: 'client-456' },
				audience,
			);

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
			const legacyAudienceToken = jwtService.signForResource(
				{ sub: 'user-123', client_id: 'client-456' },
				'mcp-server-api',
			);

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
			const legacyToken = jwtService.signForResource(
				{ sub: userId, client_id: clientId },
				'mcp-server-api',
			);
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
			const urlToken = jwtService.signForResource(
				{ sub: userId, client_id: clientId },
				TEST_RESOURCE_URL,
			);
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

			// The caller carries the client the token was issued to, handed back so
			// callers can attribute activity per client and not only per user.
			expect(result).toEqual({ user, caller: { authType: 'oauth', clientId }, scopes: [] });
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
		});
	});

	describe('authorizeSealedGrant', () => {
		const grant = { audiences: ['https://host/mcp/wf'], executeAccessWorkflowId: 'wf' };

		it('returns false when the user no longer exists', async () => {
			userRepository.findOne.mockResolvedValue(null);

			expect(await service.authorizeSealedGrant('user-123', grant)).toBe(false);
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('returns false when the user is disabled', async () => {
			userRepository.findOne.mockResolvedValue(mock<User>({ id: 'user-123', disabled: true }));

			expect(await service.authorizeSealedGrant('user-123', grant)).toBe(false);
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).not.toHaveBeenCalled();
		});

		it('grants when the user still holds workflow:execute on the bound workflow', async () => {
			const user = mock<User>({ id: 'user-123', disabled: false });
			userRepository.findOne.mockResolvedValue(user);
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set(['wf']));

			expect(await service.authorizeSealedGrant('user-123', grant)).toBe(true);
			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: { id: 'user-123' },
				relations: ['role'],
			});
			expect(workflowFinderService.findWorkflowIdsWithScopeForUser).toHaveBeenCalledWith(
				['wf'],
				user,
				['workflow:execute'],
			);
		});

		it('denies when the user no longer holds workflow:execute on the bound workflow', async () => {
			userRepository.findOne.mockResolvedValue(mock<User>({ id: 'user-123', disabled: false }));
			workflowFinderService.findWorkflowIdsWithScopeForUser.mockResolvedValue(new Set());

			expect(await service.authorizeSealedGrant('user-123', grant)).toBe(false);
		});
	});

	describe('verifyOAuthAccessToken audience resolution', () => {
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
				surface: 'instance-mcp',
				id: 'instance-mcp',
				getResourceUrl: () => RESOURCE_A_URL,
				getAudiences: () => [RESOURCE_A_URL, LEGACY_AUDIENCE],
				scopes: [],
				authorize: async () => true,
				isDefault: true,
			});
			multiResourceRegistry.register({
				surface: 'trigger',
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
				multiResourceRegistry,
				txRunner,
				workflowFinderService,
				urlService,
				signingKeyService,
			);
		});

		it('should reject a token whose aud belongs to another resource', async () => {
			const tokenForResourceA = jwtService.signForResource(
				{ sub: 'user-123', client_id: 'client-456' },
				RESOURCE_A_URL,
			);

			await expect(
				multiResourceService.verifyAccessToken(tokenForResourceA, RESOURCE_B_URL),
			).rejects.toThrow('JWT Verification Failed');
		});

		it('should not accept the legacy audience at a non-default resource', async () => {
			const legacyToken = jwtService.signForResource(
				{ sub: 'user-123', client_id: 'client-456' },
				LEGACY_AUDIENCE,
			);

			await expect(
				multiResourceService.verifyAccessToken(legacyToken, RESOURCE_B_URL),
			).rejects.toThrow('JWT Verification Failed');
		});

		it('should accept a token at its own resource', async () => {
			const tokenForResourceB = jwtService.signForResource(
				{ sub: 'user-123', client_id: 'client-456' },
				RESOURCE_B_URL,
			);
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: tokenForResourceB, clientId: 'client-456', userId: 'user-123' }),
			);

			await expect(
				multiResourceService.verifyAccessToken(tokenForResourceB, RESOURCE_B_URL),
			).resolves.toMatchObject({ clientId: 'client-456' });
		});

		it('should still accept the legacy audience at the default (instance MCP) resource', async () => {
			const legacyToken = jwtService.signForResource(
				{ sub: 'user-123', client_id: 'client-456' },
				LEGACY_AUDIENCE,
			);
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: legacyToken, clientId: 'client-456', userId: 'user-123' }),
			);

			await expect(
				multiResourceService.verifyAccessToken(legacyToken, RESOURCE_A_URL),
			).resolves.toMatchObject({ clientId: 'client-456' });
		});
	});

	describe('scope handling', () => {
		const RESOURCE_SCOPES = ['workflow:read', 'workflow:write', 'execution:read'];

		let scopedService: OAuthTokenService;

		beforeAll(() => {
			const scopedRegistry = new ProtectedResourceRegistry(mock<Logger>());
			scopedRegistry.register({
				surface: 'instance-mcp',
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
				scopedRegistry,
				txRunner,
				workflowFinderService,
				urlService,
				signingKeyService,
			);
		});

		it('carries the stored grant scopes over on rotation', async () => {
			const refreshTokenRecord = {
				token: 'scoped-refresh-token',
				clientId: 'client-123',
				userId: 'user-456',
				expiresAt: Date.now() + 1000000,
				scope: ['workflow:read'],
				resource: TEST_RESOURCE_URL,
			} as RefreshToken;

			refreshTokenRepository.findByToken.mockResolvedValue(refreshTokenRecord);
			refreshTokenRepository.deleteValidByToken.mockResolvedValue(1);

			const result = await scopedService.validateAndRotateRefreshToken(
				'scoped-refresh-token',
				'client-123',
			);

			expect(result.scope).toBe('workflow:read');
		});

		it('treats a token without a scope claim as having no scopes', async () => {
			// cannot occur legitimately: migration 1784000000047 deleted every
			// access token minted before scoping shipped
			const legacyToken = jwtService.signForResource(
				{ sub: 'user-123', client_id: 'client-456' },
				TEST_RESOURCE_URL,
			);
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token: legacyToken, clientId: 'client-456', userId: 'user-123' }),
			);

			const result = await scopedService.verifyAccessToken(legacyToken);

			expect(result.scopes).toEqual([]);
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

	// Chain test with the real MCP protected resource, matching the middleware's
	// gate (expectedAudience = getResourceUrl(), which is derived from the
	// configured MCP base URL when set).
	describe('audience gate with a configured MCP base URL', () => {
		const CONFIGURED_RESOURCE_URL = 'https://n8n-mcp.example.com/mcp-server/http';

		let configuredService: OAuthTokenService;

		beforeAll(() => {
			const urlService = mock<UrlService>();
			urlService.getInstanceBaseUrl.mockReturnValue(TEST_BASE_URL);
			const mcpConfig = mock<McpConfig>();
			mcpConfig.baseUrl = 'https://n8n-mcp.example.com';
			const mcpResource = new McpProtectedResource(
				urlService,
				mock<McpSettingsService>(),
				mcpConfig,
				mock<GlobalConfig>(),
				mock<ModuleRegistry>(),
				mock<LicenseState>(),
				mock<PostHogClient>(),
			);

			const configuredRegistry = new ProtectedResourceRegistry(mock<Logger>());
			configuredRegistry.register(mcpResource);

			configuredService = new OAuthTokenService(
				logger,
				jwtService,
				userRepository,
				accessTokenRepository,
				refreshTokenRepository,
				configuredRegistry,
				txRunner,
				workflowFinderService,
				urlService,
				signingKeyService,
			);
		});

		it.each([
			['the configured resource URL', CONFIGURED_RESOURCE_URL],
			['the instance-base-URL-derived resource URL', TEST_RESOURCE_URL],
			['the legacy audience', LEGACY_AUDIENCE],
		])('should accept a token whose aud is %s', async (_, audience) => {
			const token = jwtService.signForResource(
				{ sub: 'user-123', client_id: 'client-456' },
				audience,
			);
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token, clientId: 'client-456', userId: 'user-123' }),
			);

			await expect(
				configuredService.verifyAccessToken(token, CONFIGURED_RESOURCE_URL),
			).resolves.toMatchObject({ clientId: 'client-456' });
		});

		it('should reject a token whose aud is an unconfigured host', async () => {
			const token = jwtService.signForResource(
				{ sub: 'user-123', client_id: 'client-456' },
				'https://other.example.com/mcp-server/http',
			);

			await expect(
				configuredService.verifyAccessToken(token, CONFIGURED_RESOURCE_URL),
			).rejects.toThrow('JWT Verification Failed');
		});
	});

	describe('ES256 access tokens', () => {
		const USER_ID = 'user-123';
		const CLIENT_ID = 'client-456';
		const ATTACKER_KEY = generateKeyPairSync('ec', { namedCurve: 'P-256' });
		let kid: string;
		let privateKey: KeyObject;

		const validClaims = () => {
			const now = Math.floor(Date.now() / 1000);
			return {
				iss: TEST_BASE_URL,
				sub: USER_ID,
				aud: TEST_RESOURCE_URL,
				client_id: CLIENT_ID,
				jti: 'jti-1',
				iat: now,
				exp: now + OAUTH_ACCESS_TOKEN_TTL_SECONDS,
				scope: '',
				meta: { isOAuth: true },
			};
		};

		const signEs256 = (claims: Record<string, unknown>, header: Record<string, unknown> = {}) =>
			forgeJwt({ alg: 'ES256', typ: 'at+jwt', kid, ...header }, claims, es256Signer(privateKey));

		const hmacSigner = (secret: string | Buffer) => (signingInput: string) =>
			createHmac('sha256', secret).update(signingInput).digest();

		/** Signs with the HMAC secret, the way n8n minted access tokens before ES256. */
		const signHmac = (options: PurposedSignOptions) => {
			const { aud, ...claims } = validClaims();
			return jwtService.signForResource(claims, aud, options);
		};

		const storeToken = (token: string) => {
			accessTokenRepository.findOne.mockResolvedValue(
				mock<AccessToken>({ token, clientId: CLIENT_ID, userId: USER_ID }),
			);
		};

		/** The token is in the database, so only its signature and claims can fail it. */
		const expectRejected = async (token: string) => {
			storeToken(token);
			await expect(service.verifyAccessToken(token, TEST_RESOURCE_URL)).rejects.toThrow(
				JWTVerificationError,
			);
		};

		beforeAll(() => {
			const [row] = signingKeys.keyStore.rows;
			kid = row.id;
			privateKey = readStoredPrivateKey(row);
		});

		describe('with a kid', () => {
			it('verifies against the key the kid names and never against the HMAC secret', async () => {
				const { accessToken } = service.generateTokenPair(USER_ID, CLIENT_ID, undefined, []);
				storeToken(accessToken);
				const signingVerify = vi.spyOn(signingKeyService, 'verifyAccessToken');
				const hmacVerify = vi.spyOn(jwtService, 'verify');

				try {
					await expect(
						service.verifyAccessToken(accessToken, TEST_RESOURCE_URL),
					).resolves.toMatchObject({ clientId: CLIENT_ID, extra: { userId: USER_ID } });
					expect(signingVerify).toHaveBeenCalledWith(
						accessToken,
						expect.objectContaining({ kid, issuer: TEST_BASE_URL }),
					);
					expect(hmacVerify).not.toHaveBeenCalled();
				} finally {
					signingVerify.mockRestore();
					hmacVerify.mockRestore();
				}
			});

			it.each<[string, Record<string, unknown>, Record<string, unknown>]>([
				['a wrong aud', { aud: 'https://other.example.com/mcp' }, {}],
				['a wrong iss', { iss: 'https://attacker.example.com' }, {}],
				['a wrong typ', {}, { typ: 'JWT' }],
				['an expired exp', { exp: 1 }, {}],
			])('rejects a token with %s', async (_, claimOverrides, headerOverrides) => {
				await expectRejected(signEs256({ ...validClaims(), ...claimOverrides }, headerOverrides));
			});
		});

		describe('algorithm confusion', () => {
			it('rejects HS256 signed with the public key PEM as the secret', async () => {
				const pem = createPublicKey(privateKey).export({ type: 'spki', format: 'pem' });

				await expectRejected(
					forgeJwt({ alg: 'HS256', typ: 'at+jwt', kid }, validClaims(), hmacSigner(pem)),
				);
			});

			it('rejects HS256 signed with the public JWK JSON as the secret', async () => {
				const [publicJwk] = await signingKeyService.getPublicJwks();

				await expectRejected(
					forgeJwt(
						{ alg: 'HS256', typ: 'at+jwt', kid },
						validClaims(),
						hmacSigner(JSON.stringify(publicJwk)),
					),
				);
			});

			it('rejects a valid HMAC token with a kid added', async () => {
				const token = signHmac({
					keyid: kid,
					header: { alg: 'HS256', typ: 'at+jwt' },
				});

				await expectRejected(token);
			});

			it('rejects alg none', async () => {
				await expectRejected(forgeJwt({ alg: 'none', typ: 'at+jwt', kid }, validClaims(), null));
			});

			it('rejects ES384 in the header over a signature from the real key', async () => {
				await expectRejected(
					forgeJwt({ alg: 'ES384', typ: 'at+jwt', kid }, validClaims(), es256Signer(privateKey)),
				);
			});

			it('rejects RS256 signed with an RSA key under the real kid', async () => {
				const { privateKey: rsaKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });

				await expectRejected(
					forgeJwt({ alg: 'RS256', typ: 'at+jwt', kid }, validClaims(), rs256Signer(rsaKey)),
				);
			});

			it('rejects another P-256 key under the real kid', async () => {
				await expectRejected(
					forgeJwt(
						{ alg: 'ES256', typ: 'at+jwt', kid },
						validClaims(),
						es256Signer(ATTACKER_KEY.privateKey),
					),
				);
			});

			it('rejects a P-384 key under the real kid', async () => {
				const { privateKey: p384Key } = generateKeyPairSync('ec', { namedCurve: 'P-384' });

				await expectRejected(
					forgeJwt({ alg: 'ES256', typ: 'at+jwt', kid }, validClaims(), es256Signer(p384Key)),
				);
			});

			it('rejects an all-zero signature', async () => {
				await expectRejected(
					forgeJwt({ alg: 'ES256', typ: 'at+jwt', kid }, validClaims(), () => Buffer.alloc(64)),
				);
			});

			it('rejects the JWE key under its own kid', async () => {
				const { privateKey: jweKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
				const jweJwk = {
					...jweKey.export({ format: 'jwk' }),
					kid: 'jwe-kid',
					alg: 'RSA-OAEP-256',
					use: 'enc',
				};
				const now = new Date();
				signingKeys.keyStore.rows.push(
					mock<DeploymentKey>({
						id: 'jwe-kid',
						type: OAUTH_JWE_PRIVATE_KEY_TYPE,
						value: `wrapped:${JSON.stringify(jweJwk)}`,
						algorithm: 'RSA-OAEP-256',
						status: 'active',
						createdAt: now,
						updatedAt: now,
					}),
				);
				signingKeys.cacheStore.clear();

				try {
					await expectRejected(
						forgeJwt(
							{ alg: 'RS256', typ: 'at+jwt', kid: 'jwe-kid' },
							validClaims(),
							rs256Signer(jweKey),
						),
					);
				} finally {
					signingKeys.keyStore.rows.pop();
					signingKeys.cacheStore.clear();
				}
			});

			it.each<[string, unknown]>([
				['an unknown kid', 'unknown-kid'],
				['an empty kid', ''],
				['a numeric kid', 123],
				['an object kid', { id: 'x' }],
			])('rejects %s', async (_, badKid) => {
				await expectRejected(signEs256(validClaims(), { kid: badKid }));
			});

			it('ignores an embedded jwk header', async () => {
				const jwk = ATTACKER_KEY.publicKey.export({ format: 'jwk' });

				await expectRejected(
					forgeJwt(
						{ alg: 'ES256', typ: 'at+jwt', kid, jwk },
						validClaims(),
						es256Signer(ATTACKER_KEY.privateKey),
					),
				);
			});

			it('ignores a jku header', async () => {
				await expectRejected(
					forgeJwt(
						{ alg: 'ES256', typ: 'at+jwt', kid, jku: 'https://attacker.example.com/jwks.json' },
						validClaims(),
						es256Signer(ATTACKER_KEY.privateKey),
					),
				);
			});
		});

		describe('without a kid', () => {
			it('rejects an ES256 token whose kid was removed', async () => {
				await expectRejected(
					forgeJwt({ alg: 'ES256', typ: 'at+jwt' }, validClaims(), es256Signer(privateKey)),
				);
			});

			it('accepts a legacy HS256 token until it expires', async () => {
				vi.useFakeTimers({ toFake: ['Date'] });
				try {
					// Minted the way n8n did before ES256.
					const accessToken = signHmac({
						header: { typ: 'at+jwt', alg: 'HS256' },
					});
					storeToken(accessToken);

					await expect(
						service.verifyAccessToken(accessToken, TEST_RESOURCE_URL),
					).resolves.toMatchObject({ clientId: CLIENT_ID });

					vi.advanceTimersByTime((OAUTH_ACCESS_TOKEN_TTL_SECONDS + 1) * 1000);

					await expect(service.verifyAccessToken(accessToken, TEST_RESOURCE_URL)).rejects.toThrow(
						JWTVerificationError,
					);
				} finally {
					vi.useRealTimers();
				}
			});

			it('rejects HS512', async () => {
				const token = signHmac({
					algorithm: 'HS512',
					header: { alg: 'HS512', typ: 'at+jwt' },
				});

				await expectRejected(token);
			});
		});
	});
});

import type { PostHogClient } from '@/posthog';
