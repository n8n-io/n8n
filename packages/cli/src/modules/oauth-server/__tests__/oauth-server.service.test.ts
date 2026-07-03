import type { Mock, Mocked } from 'vitest';
import {
	InvalidGrantError,
	InvalidTargetError,
} from '@modelcontextprotocol/sdk/server/auth/errors.js';
import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import type { Response } from 'express';
import { mock } from 'vitest-mock-extended';

import type { AuthorizationCode } from '../database/entities/oauth-authorization-code.entity';
import type { OAuthClient } from '../database/entities/oauth-client.entity';
import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';
import { UserConsentRepository } from '../database/repositories/oauth-user-consent.repository';
import { OAuthAuthorizationCodeService } from '../oauth-authorization-code.service';
import { OAuthServerService } from '../oauth-server.service';
import { OAuthSessionService } from '../oauth-session.service';
import { OAuthTokenService } from '../oauth-token.service';
import { ProtectedResourceRegistry } from '@/services/protected-resource.registry';

const SUPPORTED_SCOPES = ['tool:listWorkflows', 'tool:getWorkflowDetails'];
const TEST_RESOURCE_URL = 'https://n8n.example.com/mcp-server/http';

let logger: Mocked<Logger>;
let oauthSessionService: Mocked<OAuthSessionService>;
let oauthClientRepository: Mocked<OAuthClientRepository>;
let tokenService: Mocked<OAuthTokenService>;
let authorizationCodeService: Mocked<OAuthAuthorizationCodeService>;
let service: OAuthServerService;
let userConsentRepository: Mocked<UserConsentRepository>;
let getAllowedRedirectUris: Mock<() => Promise<string[]>>;

describe('OAuthServerService', () => {
	beforeAll(() => {
		logger = mockInstance(Logger);
		oauthSessionService = mockInstance(OAuthSessionService);
		oauthClientRepository = mockInstance(OAuthClientRepository);
		tokenService = mockInstance(OAuthTokenService);
		authorizationCodeService = mockInstance(OAuthAuthorizationCodeService);
		userConsentRepository = mockInstance(UserConsentRepository);
		getAllowedRedirectUris = vi.fn<(...args: []) => Promise<string[]>>().mockResolvedValue([]);

		const resourceRegistry = new ProtectedResourceRegistry(mock<Logger>());
		resourceRegistry.register({
			id: 'instance-mcp',
			getResourceUrl: () => TEST_RESOURCE_URL,
			getAudiences: () => [TEST_RESOURCE_URL, 'mcp-server-api'],
			scopes: SUPPORTED_SCOPES,
			isDefault: true,
			getAllowedRedirectUris,
		});

		service = new OAuthServerService(
			logger,
			mockInstance(GlobalConfig),
			oauthSessionService,
			oauthClientRepository,
			tokenService,
			authorizationCodeService,
			userConsentRepository,
			resourceRegistry,
		);
	});

	beforeEach(() => {
		vi.clearAllMocks();
		getAllowedRedirectUris.mockResolvedValue([]);
	});

	describe('clientsStore', () => {
		describe('getClient', () => {
			it('should return client information when client exists', async () => {
				const client = {
					id: 'client-123',
					name: 'Test Client',
					redirectUris: ['https://example.com/callback'],
					grantTypes: ['authorization_code', 'refresh_token'],
					tokenEndpointAuthMethod: 'none',
					clientSecret: null,
					clientSecretExpiresAt: null,
				} as OAuthClient;

				oauthClientRepository.findOneBy.mockResolvedValue(client);

				const result = await service.clientsStore.getClient('client-123');

				expect(result).toEqual({
					client_id: 'client-123',
					client_name: 'Test Client',
					redirect_uris: ['https://example.com/callback'],
					grant_types: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_method: 'none',
					response_types: ['code'],
					...(SUPPORTED_SCOPES.length > 0 && { scope: SUPPORTED_SCOPES.join(' ') }),
					logo_uri: undefined,
					tos_uri: undefined,
				});
			});

			it('should include client secret when present', async () => {
				const client = {
					id: 'client-123',
					name: 'Test Client',
					redirectUris: ['https://example.com/callback'],
					grantTypes: ['authorization_code'],
					tokenEndpointAuthMethod: 'client_secret_post',
					clientSecret: 'secret-value',
					clientSecretExpiresAt: 1234567890,
				} as OAuthClient;

				oauthClientRepository.findOneBy.mockResolvedValue(client);

				const result = await service.clientsStore.getClient('client-123');

				expect(result).toMatchObject({
					client_secret: 'secret-value',
					client_secret_expires_at: 1234567890,
				});
			});

			it('should return undefined when client not found', async () => {
				oauthClientRepository.findOneBy.mockResolvedValue(null);

				const result = await service.clientsStore.getClient('nonexistent');

				expect(result).toBeUndefined();
			});
		});

		describe('registerClient', () => {
			it('should save client with all required fields', async () => {
				const clientInfo = {
					client_id: 'new-client-123',
					client_name: 'New Client',
					redirect_uris: ['https://example.com/callback'],
					grant_types: ['authorization_code', 'refresh_token'],
					token_endpoint_auth_method: 'none',
					response_types: ['code'],
					scope: 'read write',
					logo_uri: undefined,
					tos_uri: undefined,
				};

				oauthClientRepository.insert.mockResolvedValue({} as any);

				const result = await service.clientsStore.registerClient!(clientInfo);

				expect(oauthClientRepository.insert).toHaveBeenCalledWith({
					id: 'new-client-123',
					name: 'New Client',
					redirectUris: ['https://example.com/callback'],
					grantTypes: ['authorization_code', 'refresh_token'],
					clientSecret: null,
					clientSecretExpiresAt: null,
					tokenEndpointAuthMethod: 'none',
				});
				expect(result).toEqual(clientInfo);
			});

			it('should save client with client secret', async () => {
				const clientInfo = {
					client_id: 'new-client-123',
					client_name: 'New Client',
					redirect_uris: ['https://example.com/callback'],
					grant_types: ['authorization_code'],
					token_endpoint_auth_method: 'client_secret_post',
					client_secret: 'secret-123',
					client_secret_expires_at: 1234567890,
					response_types: ['code'],
					scope: 'read',
					logo_uri: undefined,
					tos_uri: undefined,
				};

				oauthClientRepository.insert.mockResolvedValue({} as any);

				await service.clientsStore.registerClient!(clientInfo);

				expect(oauthClientRepository.insert).toHaveBeenCalledWith({
					id: 'new-client-123',
					name: 'New Client',
					redirectUris: ['https://example.com/callback'],
					grantTypes: ['authorization_code'],
					clientSecret: 'secret-123',
					clientSecretExpiresAt: 1234567890,
					tokenEndpointAuthMethod: 'client_secret_post',
				});
			});

			it('should handle save errors gracefully', async () => {
				const clientInfo = {
					client_id: 'new-client-123',
					client_name: 'New Client',
					redirect_uris: ['https://example.com/callback'],
					grant_types: ['authorization_code'],
					token_endpoint_auth_method: 'none',
					response_types: ['code'],
					scope: 'read',
					logo_uri: undefined,
					tos_uri: undefined,
				};

				const error = new Error('Database error');
				oauthClientRepository.insert.mockRejectedValue(error);

				await expect(service.clientsStore.registerClient!(clientInfo)).rejects.toThrow(
					'Database error',
				);
			});
		});
	});

	describe('authorize', () => {
		it('should create session and redirect to consent page', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read write',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const params = {
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-123',
				state: 'state-xyz',
				resource: new URL('https://n8n.example.com/mcp-server/http'),
			};

			const res = mock<Response>();

			getAllowedRedirectUris.mockResolvedValue(['https://example.com/callback']);

			await service.authorize(client, params, res);

			expect(oauthSessionService.createSession).toHaveBeenCalledWith(res, {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-123',
				state: 'state-xyz',
				resource: 'https://n8n.example.com/mcp-server/http',
			});
			expect(res.redirect).toHaveBeenCalledWith('/oauth/consent');
		});

		it('should handle null state parameter', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const params = {
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-123',
			};

			const res = mock<Response>();

			getAllowedRedirectUris.mockResolvedValue(['https://example.com/callback']);

			await service.authorize(client, params, res);

			expect(oauthSessionService.createSession).toHaveBeenCalledWith(res, {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-123',
				state: null,
				resource: undefined,
			});
		});

		it('should reject invalid redirect URI', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const params = {
				redirectUri: 'https://attacker.com/callback',
				codeChallenge: 'challenge-123',
			};

			const res = mock<Response>();
			res.status.mockReturnThis();
			res.json.mockReturnThis();

			getAllowedRedirectUris.mockResolvedValue(['https://example.com/callback']);

			await service.authorize(client, params, res);

			expect(logger.warn).toHaveBeenCalledWith(
				'MCP OAuth authorization rejected: requested redirect URI is not in the configured allowlist',
				{
					clientId: 'client-123',
					attemptedUri: 'https://attacker.com/callback',
				},
			);
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				error: 'invalid_request',
				error_description: 'Redirect URI not in allowed list',
			});
			expect(oauthSessionService.createSession).not.toHaveBeenCalled();
		});

		it('should allow a loopback redirect URI on a different port than the allowlist entry', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['http://localhost:3118/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const params = {
				redirectUri: 'http://localhost:52680/callback',
				codeChallenge: 'challenge-123',
				state: 'state-xyz',
			};

			const res = mock<Response>();

			getAllowedRedirectUris.mockResolvedValue(['http://localhost:3118/callback']);

			await service.authorize(client, params, res);

			expect(oauthSessionService.createSession).toHaveBeenCalledWith(
				res,
				expect.objectContaining({ redirectUri: 'http://localhost:52680/callback' }),
			);
			expect(res.redirect).toHaveBeenCalledWith('/oauth/consent');
		});

		it('should reject a loopback redirect URI whose path differs from the allowlist entry', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['http://localhost:3118/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const params = {
				redirectUri: 'http://localhost:52680/evil',
				codeChallenge: 'challenge-123',
			};

			const res = mock<Response>();
			res.status.mockReturnThis();
			res.json.mockReturnThis();

			getAllowedRedirectUris.mockResolvedValue(['http://localhost:3118/callback']);

			await service.authorize(client, params, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(oauthSessionService.createSession).not.toHaveBeenCalled();
		});

		it('should still require an exact match for non-loopback redirect URIs on a different port', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const params = {
				redirectUri: 'https://example.com:8443/callback',
				codeChallenge: 'challenge-123',
			};

			const res = mock<Response>();
			res.status.mockReturnThis();
			res.json.mockReturnThis();

			getAllowedRedirectUris.mockResolvedValue(['https://example.com/callback']);

			await service.authorize(client, params, res);

			expect(res.status).toHaveBeenCalledWith(400);
			expect(oauthSessionService.createSession).not.toHaveBeenCalled();
		});

		it('should allow any redirect URI when whitelist is empty', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const params = {
				redirectUri: 'https://any-domain.com/callback',
				codeChallenge: 'challenge-123',
				state: 'state-xyz',
			};

			const res = mock<Response>();

			getAllowedRedirectUris.mockResolvedValue([]);

			await service.authorize(client, params, res);

			expect(oauthSessionService.createSession).toHaveBeenCalledWith(res, {
				clientId: 'client-123',
				redirectUri: 'https://any-domain.com/callback',
				codeChallenge: 'challenge-123',
				state: 'state-xyz',
				resource: undefined,
			});
			expect(res.redirect).toHaveBeenCalledWith('/oauth/consent');
			expect(logger.warn).not.toHaveBeenCalled();
		});

		it('should reject invalid resource indicators', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const params = {
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-123',
				resource: new URL('https://attacker.example.com/mcp-server/http'),
			};

			const res = mock<Response>();
			res.status.mockReturnThis();
			res.json.mockReturnThis();

			await service.authorize(client, params, res);

			expect(oauthSessionService.createSession).not.toHaveBeenCalled();
			expect(oauthSessionService.clearSession).toHaveBeenCalledWith(res);
			expect(res.status).toHaveBeenCalledWith(400);
			expect(res.json).toHaveBeenCalledWith({
				error: 'invalid_target',
				error_description: 'Invalid resource indicator',
			});
		});

		it('should accept a trailing-slash resource and store the normalized URL', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const params = {
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-123',
				// trailing slash — semantically equivalent to the canonical URL
				resource: new URL('https://n8n.example.com/mcp-server/http/'),
			};

			const res = mock<Response>();

			await service.authorize(client, params, res);

			// Should succeed and store the slash-stripped canonical form
			expect(oauthSessionService.createSession).toHaveBeenCalledWith(res, {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-123',
				state: null,
				resource: 'https://n8n.example.com/mcp-server/http',
			});
			expect(res.redirect).toHaveBeenCalledWith('/oauth/consent');
		});

		it('should handle errors and clear session', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const params = {
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-123',
			};

			const res = mock<Response>();
			res.status.mockReturnThis();
			res.json.mockReturnThis();

			getAllowedRedirectUris.mockResolvedValue(['https://example.com/callback']);

			const error = new Error('Session creation failed');
			oauthSessionService.createSession.mockImplementation(() => {
				throw error;
			});

			await service.authorize(client, params, res);

			expect(logger.error).toHaveBeenCalledWith('Error in authorize method', {
				error,
				clientId: 'client-123',
			});
			expect(oauthSessionService.clearSession).toHaveBeenCalledWith(res);
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({
				error: 'server_error',
				error_description: 'Internal server error',
			});
		});
	});

	describe('challengeForAuthorizationCode', () => {
		it('should return code challenge from authorization code service', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			authorizationCodeService.getCodeChallenge.mockResolvedValue('challenge-123');

			const result = await service.challengeForAuthorizationCode(client, 'auth-code-123');

			expect(authorizationCodeService.getCodeChallenge).toHaveBeenCalledWith(
				'auth-code-123',
				'client-123',
			);
			expect(result).toBe('challenge-123');
		});
	});

	describe('exchangeAuthorizationCode', () => {
		it('should validate code and return token pair', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const authRecord = {
				userId: 'user-456',
				clientId: 'client-123',
				resource: 'https://n8n.example.com/mcp-server/http',
			} as AuthorizationCode;

			authorizationCodeService.findAuthorizationCode.mockResolvedValue(authRecord);
			tokenService.generateTokenPair.mockReturnValue({
				accessToken: 'access-token-123',
				refreshToken: 'refresh-token-456',
			});
			tokenService.saveTokenPair.mockResolvedValue();
			tokenService.getAccessTokenExpirySeconds.mockReturnValue(3600);

			const result = await service.exchangeAuthorizationCode(
				client,
				'auth-code-123',
				'verifier-123',
				'https://example.com/callback',
			);

			expect(authorizationCodeService.findAuthorizationCode).toHaveBeenCalledWith(
				'auth-code-123',
				'client-123',
				'https://example.com/callback',
			);
			expect(authorizationCodeService.markAuthorizationCodeAsUsed).toHaveBeenCalledWith(
				'auth-code-123',
			);
			expect(tokenService.generateTokenPair).toHaveBeenCalledWith(
				'user-456',
				'client-123',
				'https://n8n.example.com/mcp-server/http',
			);
			expect(tokenService.saveTokenPair).toHaveBeenCalledWith(
				'access-token-123',
				'refresh-token-456',
				'client-123',
				'user-456',
			);
			expect(result).toEqual({
				access_token: 'access-token-123',
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: 'refresh-token-456',
			});
		});

		it('should handle authorization code exchange without redirect URI', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const authRecord = {
				userId: 'user-456',
				clientId: 'client-123',
				resource: null,
			} as AuthorizationCode;

			authorizationCodeService.findAuthorizationCode.mockResolvedValue(authRecord);
			tokenService.generateTokenPair.mockReturnValue({
				accessToken: 'access-token-123',
				refreshToken: 'refresh-token-456',
			});

			await service.exchangeAuthorizationCode(client, 'auth-code-123', 'verifier-123');

			expect(authorizationCodeService.findAuthorizationCode).toHaveBeenCalledWith(
				'auth-code-123',
				'client-123',
				undefined,
			);
			expect(authorizationCodeService.markAuthorizationCodeAsUsed).toHaveBeenCalledWith(
				'auth-code-123',
			);
			expect(tokenService.generateTokenPair).toHaveBeenCalledWith(
				'user-456',
				'client-123',
				undefined,
			);
		});

		it('should propagate InvalidGrantError when markAuthorizationCodeAsUsed detects concurrent consumption', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const authRecord = {
				userId: 'user-456',
				clientId: 'client-123',
				resource: 'https://n8n.example.com/mcp-server/http',
			} as AuthorizationCode;

			authorizationCodeService.findAuthorizationCode.mockResolvedValue(authRecord);
			authorizationCodeService.markAuthorizationCodeAsUsed.mockImplementation(async () => {
				throw new InvalidGrantError('Authorization code already used');
			});

			await expect(
				service.exchangeAuthorizationCode(
					client,
					'auth-code-123',
					'verifier-123',
					'https://example.com/callback',
				),
			).rejects.toThrow(InvalidGrantError);
		});
	});

	describe('exchangeRefreshToken', () => {
		it('should validate and rotate refresh token', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['refresh_token'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			const newTokens = {
				access_token: 'new-access-token',
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: 'new-refresh-token',
			};

			tokenService.validateAndRotateRefreshToken.mockResolvedValue(newTokens);

			const result = await service.exchangeRefreshToken(
				client,
				'old-refresh-token',
				['read'],
				new URL('https://n8n.example.com/mcp-server/http'),
			);

			expect(tokenService.validateAndRotateRefreshToken).toHaveBeenCalledWith(
				'old-refresh-token',
				'client-123',
				'https://n8n.example.com/mcp-server/http',
			);
			expect(result).toEqual(newTokens);
		});

		it('should keep legacy behavior when resource is omitted', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['refresh_token'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			tokenService.validateAndRotateRefreshToken.mockResolvedValue({
				access_token: 'new-access-token',
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: 'new-refresh-token',
			});

			await service.exchangeRefreshToken(client, 'old-refresh-token', ['read']);

			expect(tokenService.validateAndRotateRefreshToken).toHaveBeenCalledWith(
				'old-refresh-token',
				'client-123',
				undefined,
			);
		});

		it('should reject invalid resource indicators on refresh token exchange', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['refresh_token'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			await expect(
				service.exchangeRefreshToken(
					client,
					'old-refresh-token',
					['read'],
					new URL('https://attacker.example.com/mcp-server/http'),
				),
			).rejects.toThrow(InvalidTargetError);
		});

		it('should normalize a trailing-slash resource before passing it to token rotation', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['refresh_token'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			tokenService.validateAndRotateRefreshToken.mockResolvedValue({
				access_token: 'new-access-token',
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: 'new-refresh-token',
			});

			await service.exchangeRefreshToken(
				client,
				'old-refresh-token',
				['read'],
				// trailing slash — must be stripped before reaching token service
				new URL('https://n8n.example.com/mcp-server/http/'),
			);

			expect(tokenService.validateAndRotateRefreshToken).toHaveBeenCalledWith(
				'old-refresh-token',
				'client-123',
				'https://n8n.example.com/mcp-server/http', // slash stripped
			);
		});
	});

	describe('verifyAccessToken', () => {
		it('should verify access token and return auth info', async () => {
			const authInfo = {
				token: 'access-token-123',
				userId: 'user-123',
				clientId: 'client-456',
				scopes: ['read', 'write'],
			};

			tokenService.verifyAccessToken.mockResolvedValue(authInfo);

			const result = await service.verifyAccessToken('access-token-123');

			expect(tokenService.verifyAccessToken).toHaveBeenCalledWith('access-token-123');
			expect(result).toEqual(authInfo);
		});
	});

	describe('deleteClient', () => {
		it('should delete client when user has consent', async () => {
			const client = {
				id: 'client-123',
				name: 'Test Client',
			} as OAuthClient;

			oauthClientRepository.findOne.mockResolvedValue(client);
			userConsentRepository.findOneBy.mockResolvedValue({
				userId: 'user-456',
				clientId: 'client-123',
			} as any);
			oauthClientRepository.delete.mockResolvedValue({} as any);

			await service.deleteClient('client-123', 'user-456');

			expect(oauthClientRepository.delete).toHaveBeenCalledWith({ id: 'client-123' });
		});

		it('should throw when client does not exist', async () => {
			oauthClientRepository.findOne.mockResolvedValue(null);

			await expect(service.deleteClient('nonexistent', 'user-456')).rejects.toThrow(
				'OAuth client with ID nonexistent not found',
			);

			expect(oauthClientRepository.delete).not.toHaveBeenCalled();
		});

		it('should throw when user has no consent for the client', async () => {
			const client = {
				id: 'client-123',
				name: 'Test Client',
			} as OAuthClient;

			oauthClientRepository.findOne.mockResolvedValue(client);
			userConsentRepository.findOneBy.mockResolvedValue(null);

			await expect(service.deleteClient('client-123', 'other-user')).rejects.toThrow(
				'OAuth client with ID client-123 not found',
			);

			expect(oauthClientRepository.delete).not.toHaveBeenCalled();
		});
	});

	describe('revokeToken', () => {
		it('should revoke access token when type hint is access_token', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			tokenService.revokeAccessToken.mockResolvedValue(true);

			await service.revokeToken(client, {
				token: 'token-123',
				token_type_hint: 'access_token',
			});

			expect(tokenService.revokeAccessToken).toHaveBeenCalledWith('token-123', 'client-123');
			expect(tokenService.revokeRefreshToken).not.toHaveBeenCalled();
		});

		it('should revoke refresh token when type hint is refresh_token', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['refresh_token'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			tokenService.revokeRefreshToken.mockResolvedValue(true);

			await service.revokeToken(client, {
				token: 'token-123',
				token_type_hint: 'refresh_token',
			});

			expect(tokenService.revokeAccessToken).not.toHaveBeenCalled();
			expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith('token-123', 'client-123');
		});

		it('should try access token first when no type hint provided', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code', 'refresh_token'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			tokenService.revokeAccessToken.mockResolvedValue(true);

			await service.revokeToken(client, {
				token: 'token-123',
			});

			expect(tokenService.revokeAccessToken).toHaveBeenCalledWith('token-123', 'client-123');
			expect(tokenService.revokeRefreshToken).not.toHaveBeenCalled();
		});

		it('should try refresh token if access token revocation fails', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code', 'refresh_token'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			tokenService.revokeAccessToken.mockResolvedValue(false);
			tokenService.revokeRefreshToken.mockResolvedValue(true);

			await service.revokeToken(client, {
				token: 'token-123',
			});

			expect(tokenService.revokeAccessToken).toHaveBeenCalledWith('token-123', 'client-123');
			expect(tokenService.revokeRefreshToken).toHaveBeenCalledWith('token-123', 'client-123');
		});

		it('should silently succeed when token not found', async () => {
			const client = {
				client_id: 'client-123',
				client_name: 'Test Client',
				redirect_uris: ['https://example.com/callback'],
				grant_types: ['authorization_code', 'refresh_token'],
				token_endpoint_auth_method: 'none',
				response_types: ['code'],
				scope: 'read',
				logo_uri: undefined,
				tos_uri: undefined,
			};

			tokenService.revokeAccessToken.mockResolvedValue(false);
			tokenService.revokeRefreshToken.mockResolvedValue(false);

			await service.revokeToken(client, {
				token: 'unknown-token',
			});

			expect(logger.debug).toHaveBeenCalledWith('Token revocation requested for unknown token', {
				clientId: 'client-123',
			});
		});
	});

	describe('resource indicator validation across multiple resources', () => {
		it('should accept any registered resource and reject unregistered ones', async () => {
			const multiRegistry = new ProtectedResourceRegistry(mock<Logger>());
			multiRegistry.register({
				id: 'instance-mcp',
				getResourceUrl: () => TEST_RESOURCE_URL,
				getAudiences: () => [TEST_RESOURCE_URL, 'mcp-server-api'],
				scopes: SUPPORTED_SCOPES,
				isDefault: true,
			});
			const secondResourceUrl = 'https://n8n.example.com/webhook/wf-1/mcp';
			multiRegistry.register({
				id: 'workflow-trigger',
				getResourceUrl: () => secondResourceUrl,
				getAudiences: () => [secondResourceUrl],
				scopes: [],
			});

			const multiResourceService = new OAuthServerService(
				logger,
				mockInstance(GlobalConfig),
				oauthSessionService,
				oauthClientRepository,
				tokenService,
				authorizationCodeService,
				userConsentRepository,
				multiRegistry,
			);

			expect(
				await (multiResourceService as any).resolveAndValidateResourceIndicator(TEST_RESOURCE_URL),
			).toBe(TEST_RESOURCE_URL);
			expect(
				await (multiResourceService as any).resolveAndValidateResourceIndicator(secondResourceUrl),
			).toBe(secondResourceUrl);
			await expect(
				(multiResourceService as any).resolveAndValidateResourceIndicator(
					'https://n8n.example.com/webhook/wf-2/mcp',
				),
			).rejects.toThrow(InvalidTargetError);
		});
	});
});
