import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { mock } from 'jest-mock-extended';
import type { Response } from 'express';

import type { AuthorizationCode } from '../database/entities/oauth-authorization-code.entity';
import type { OAuthClient } from '../database/entities/oauth-client.entity';
import { OAuthClientRepository } from '../database/repositories/oauth-client.repository';
import { McpOAuthAuthorizationCodeService } from '../mcp-oauth-authorization-code.service';
import { McpOAuthService, SUPPORTED_SCOPES } from '../mcp-oauth-service';
import { McpOAuthTokenService } from '../mcp-oauth-token.service';
import { OAuthSessionService } from '../oauth-session.service';

let logger: jest.Mocked<Logger>;
let oauthSessionService: jest.Mocked<OAuthSessionService>;
let oauthClientRepository: jest.Mocked<OAuthClientRepository>;
let tokenService: jest.Mocked<McpOAuthTokenService>;
let authorizationCodeService: jest.Mocked<McpOAuthAuthorizationCodeService>;
let service: McpOAuthService;

describe('McpOAuthService', () => {
	beforeAll(() => {
		logger = mockInstance(Logger);
		oauthSessionService = mockInstance(OAuthSessionService);
		oauthClientRepository = mockInstance(OAuthClientRepository);
		tokenService = mockInstance(McpOAuthTokenService);
		authorizationCodeService = mockInstance(McpOAuthAuthorizationCodeService);

		service = new McpOAuthService(
			logger,
			oauthSessionService,
			oauthClientRepository,
			tokenService,
			authorizationCodeService,
		);
	});

	beforeEach(() => {
		jest.clearAllMocks();
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
					scope: SUPPORTED_SCOPES.join(' '),
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
				};

				const error = new Error('Database error');
				oauthClientRepository.insert.mockRejectedValue(error);

				const result = await service.clientsStore.registerClient!(clientInfo);

				expect(logger.error).toHaveBeenCalledWith('Error registering OAuth client', {
					error,
					clientId: 'new-client-123',
				});
				expect(result).toEqual(clientInfo);
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
			};

			const params = {
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-123',
				state: 'state-xyz',
			};

			const res = mock<Response>();

			await service.authorize(client, params, res);

			expect(oauthSessionService.createSession).toHaveBeenCalledWith(res, {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-123',
				state: 'state-xyz',
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
			};

			const params = {
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-123',
			};

			const res = mock<Response>();

			await service.authorize(client, params, res);

			expect(oauthSessionService.createSession).toHaveBeenCalledWith(res, {
				clientId: 'client-123',
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-123',
				state: null,
			});
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
			};

			const params = {
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge-123',
			};

			const res = mock<Response>();
			res.status.mockReturnThis();
			res.json.mockReturnThis();

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
			};

			const authRecord = {
				userId: 'user-456',
				clientId: 'client-123',
			} as AuthorizationCode;

			authorizationCodeService.validateAndConsumeAuthorizationCode.mockResolvedValue(authRecord);
			tokenService.generateTokenPair.mockReturnValue({
				accessToken: 'access-token-123',
				refreshToken: 'refresh-token-456',
			});
			tokenService.saveTokenPair.mockResolvedValue();

			const result = await service.exchangeAuthorizationCode(
				client,
				'auth-code-123',
				'verifier-123',
				'https://example.com/callback',
			);

			expect(authorizationCodeService.validateAndConsumeAuthorizationCode).toHaveBeenCalledWith(
				'auth-code-123',
				'client-123',
				'https://example.com/callback',
			);
			expect(tokenService.generateTokenPair).toHaveBeenCalledWith('user-456', 'client-123');
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
			};

			const authRecord = {
				userId: 'user-456',
				clientId: 'client-123',
			} as AuthorizationCode;

			authorizationCodeService.validateAndConsumeAuthorizationCode.mockResolvedValue(authRecord);
			tokenService.generateTokenPair.mockReturnValue({
				accessToken: 'access-token-123',
				refreshToken: 'refresh-token-456',
			});

			await service.exchangeAuthorizationCode(client, 'auth-code-123', 'verifier-123');

			expect(authorizationCodeService.validateAndConsumeAuthorizationCode).toHaveBeenCalledWith(
				'auth-code-123',
				'client-123',
				undefined,
			);
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
			};

			const newTokens = {
				access_token: 'new-access-token',
				token_type: 'Bearer',
				expires_in: 3600,
				refresh_token: 'new-refresh-token',
			};

			tokenService.validateAndRotateRefreshToken.mockResolvedValue(newTokens);

			const result = await service.exchangeRefreshToken(client, 'old-refresh-token', ['read']);

			expect(tokenService.validateAndRotateRefreshToken).toHaveBeenCalledWith(
				'old-refresh-token',
				'client-123',
			);
			expect(result).toEqual(newTokens);
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
});
