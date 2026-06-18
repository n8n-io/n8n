import type { User } from '@n8n/db';
import { CredentialResolverError } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { AuthError } from '@/errors/response-errors/auth.error';
import type { OAuthTokenVerifierProxy } from '@/services/oauth-token-verifier-proxy.service';

import { N8NIdentifier } from '../n8n-identifier';

describe('N8NIdentifier', () => {
	let identifier: N8NIdentifier;
	let mockAuthService: jest.Mocked<AuthService>;
	let mockOAuthVerifier: jest.Mocked<OAuthTokenVerifierProxy>;

	const mockUser = mock<User>({ id: 'user-123' });

	beforeEach(() => {
		mockAuthService = mock<AuthService>();
		mockOAuthVerifier = mock<OAuthTokenVerifierProxy>();

		identifier = new N8NIdentifier(mockAuthService, mockOAuthVerifier);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('validateOptions', () => {
		it('should always succeed as no validation is required', async () => {
			await identifier.validateOptions({});
			await identifier.validateOptions({ foo: 'bar' });
		});
	});

	describe('resolve', () => {
		describe('successful resolution', () => {
			it('should resolve user ID with browserId string', async () => {
				mockAuthService.authenticateUserBasedOnToken.mockResolvedValue(mockUser);

				const context = {
					identity: 'valid-jwt-token',
					version: 1 as const,
					metadata: {
						source: 'chat-hub-injected' as const,
						method: 'GET',
						endpoint: '/api/users',
						browserId: 'browser-abc',
					},
				};

				const result = await identifier.resolve(context, {});

				expect(result).toBe('user-123');
				expect(mockAuthService.authenticateUserBasedOnToken).toHaveBeenCalledWith(
					'valid-jwt-token',
					'GET',
					'/api/users',
					'browser-abc',
				);
			});

			it('should resolve user ID with browserId undefined', async () => {
				mockAuthService.authenticateUserBasedOnToken.mockResolvedValue(mockUser);

				const context = {
					identity: 'valid-jwt-token',
					version: 1 as const,
					metadata: {
						source: 'chat-hub-injected' as const,
						method: 'POST',
						endpoint: '/api/workflows',
						browserId: undefined,
					},
				};

				const result = await identifier.resolve(context, {});

				expect(result).toBe('user-123');
				expect(mockAuthService.authenticateUserBasedOnToken).toHaveBeenCalledWith(
					'valid-jwt-token',
					'POST',
					'/api/workflows',
					undefined,
				);
			});

			it('should resolve user ID without browserId in metadata', async () => {
				mockAuthService.authenticateUserBasedOnToken.mockResolvedValue(mockUser);

				const context = {
					identity: 'valid-jwt-token',
					version: 1 as const,
					metadata: {
						source: 'chat-hub-injected' as const,
						method: 'DELETE',
						endpoint: '/api/credentials',
					},
				};

				const result = await identifier.resolve(context, {});

				expect(result).toBe('user-123');
				expect(mockAuthService.authenticateUserBasedOnToken).toHaveBeenCalledWith(
					'valid-jwt-token',
					'DELETE',
					'/api/credentials',
					undefined,
				);
			});
		});

		describe('metadata validation errors', () => {
			it('should throw CredentialResolverError when metadata is missing', async () => {
				const context = {
					identity: 'valid-jwt-token',
					version: 1 as const,
					metadata: undefined,
				};

				await expect(identifier.resolve(context, {})).rejects.toThrow(CredentialResolverError);

				// Verify auth service was never called
				expect(mockAuthService.authenticateUserBasedOnToken).not.toHaveBeenCalled();
			});

			it('should throw CredentialResolverError when browserId has invalid type', async () => {
				const context = {
					identity: 'valid-jwt-token',
					version: 1 as const,
					metadata: {
						source: 'chat-hub-injected' as const,
						method: 'GET',
						endpoint: '/api/users',
						browserId: 123, // Number instead of string
					},
				};

				await expect(identifier.resolve(context, {})).rejects.toThrow(
					expect.objectContaining({
						message: expect.stringMatching(/Invalid context metadata/),
					}),
				);

				expect(mockAuthService.authenticateUserBasedOnToken).not.toHaveBeenCalled();
			});
		});

		describe('authentication errors', () => {
			it('should propagate AuthError when token is invalid', async () => {
				const authError = new AuthError('Unauthorized');
				mockAuthService.authenticateUserBasedOnToken.mockRejectedValue(authError);

				const context = {
					identity: 'invalid-token',
					version: 1 as const,
					metadata: {
						source: 'chat-hub-injected' as const,
						method: 'GET',
						endpoint: '/api/users',
						browserId: 'browser-abc',
					},
				};

				await expect(identifier.resolve(context, {})).rejects.toThrow('Unauthorized');
			});

			it('should propagate error when authentication fails', async () => {
				const genericError = new Error('Database connection failed');
				mockAuthService.authenticateUserBasedOnToken.mockRejectedValue(genericError);

				const context = {
					identity: 'valid-token',
					version: 1 as const,
					metadata: {
						source: 'chat-hub-injected' as const,
						method: 'POST',
						endpoint: '/api/workflows',
					},
				};

				await expect(identifier.resolve(context, {})).rejects.toThrow('Database connection failed');
			});
		});

		describe('chat-hub branch with explicit source', () => {
			it('should call authenticateUserBasedOnToken when source is chat-hub-injected', async () => {
				mockAuthService.authenticateUserBasedOnToken.mockResolvedValue(mockUser);

				const context = {
					identity: 'cookie-jwt',
					version: 1 as const,
					metadata: {
						source: 'chat-hub-injected' as const,
						method: 'POST',
						endpoint: '/chat',
						browserId: 'browser-abc',
					},
				};

				const result = await identifier.resolve(context, {});

				expect(result).toBe('user-123');
				expect(mockAuthService.authenticateUserBasedOnToken).toHaveBeenCalledWith(
					'cookie-jwt',
					'POST',
					'/chat',
					'browser-abc',
				);
				expect(mockAuthService.authenticateUserByCookie).not.toHaveBeenCalled();
			});
		});

		describe('cookie-source branch', () => {
			it('should call authenticateUserBasedOnToken when source is cookie-source', async () => {
				mockAuthService.authenticateUserBasedOnToken.mockResolvedValue(mockUser);

				const context = {
					identity: 'cookie-jwt',
					version: 1 as const,
					metadata: {
						source: 'cookie-source' as const,
						method: 'GET',
						endpoint: '/api/data',
						browserId: 'browser-xyz',
					},
				};

				const result = await identifier.resolve(context, {});

				expect(result).toBe('user-123');
				expect(mockAuthService.authenticateUserBasedOnToken).toHaveBeenCalledWith(
					'cookie-jwt',
					'GET',
					'/api/data',
					'browser-xyz',
				);
				expect(mockAuthService.authenticateUserByCookie).not.toHaveBeenCalled();
			});
		});

		describe('discriminator validation', () => {
			it('should reject metadata without a source field', async () => {
				const context = {
					identity: 'valid-jwt-token',
					version: 1 as const,
					metadata: {
						method: 'GET',
						endpoint: '/api/users',
						browserId: 'browser-abc',
					},
				};

				await expect(identifier.resolve(context, {})).rejects.toThrow(CredentialResolverError);
				expect(mockAuthService.authenticateUserBasedOnToken).not.toHaveBeenCalled();
				expect(mockAuthService.authenticateUserByCookie).not.toHaveBeenCalled();
			});

			it('should reject metadata with an unknown source value', async () => {
				const context = {
					identity: 'valid-jwt-token',
					version: 1 as const,
					metadata: {
						source: 'unknown-source',
						method: 'GET',
						endpoint: '/api/users',
					},
				};

				await expect(identifier.resolve(context, {})).rejects.toThrow(CredentialResolverError);
				expect(mockAuthService.authenticateUserBasedOnToken).not.toHaveBeenCalled();
				expect(mockAuthService.authenticateUserByCookie).not.toHaveBeenCalled();
			});
		});

		describe('manual-execution branch', () => {
			it('should resolve user via authenticateUserByCookie and skip the request-bound path', async () => {
				mockAuthService.authenticateUserByCookie.mockResolvedValue(mockUser);

				const context = {
					identity: 'n8n-auth-cookie-jwt',
					version: 1 as const,
					metadata: { source: 'manual-execution' as const },
				};

				const result = await identifier.resolve(context, {});

				expect(result).toBe('user-123');
				expect(mockAuthService.authenticateUserByCookie).toHaveBeenCalledWith(
					'n8n-auth-cookie-jwt',
				);
				expect(mockAuthService.authenticateUserBasedOnToken).not.toHaveBeenCalled();
			});

			it('should propagate AuthError from authenticateUserByCookie', async () => {
				mockAuthService.authenticateUserByCookie.mockRejectedValue(new AuthError('Unauthorized'));

				const context = {
					identity: 'expired-cookie',
					version: 1 as const,
					metadata: { source: 'manual-execution' as const },
				};

				await expect(identifier.resolve(context, {})).rejects.toThrow('Unauthorized');
			});

			it('should propagate generic errors from authenticateUserByCookie', async () => {
				mockAuthService.authenticateUserByCookie.mockRejectedValue(
					new Error('Database connection failed'),
				);

				const context = {
					identity: 'cookie-jwt',
					version: 1 as const,
					metadata: { source: 'manual-execution' as const },
				};

				await expect(identifier.resolve(context, {})).rejects.toThrow('Database connection failed');
			});
		});

		describe('n8n-oauth branch', () => {
			it('should verify the token for the resource audience and resolve the user', async () => {
				mockOAuthVerifier.verifyOAuthAccessToken.mockResolvedValue({ user: mockUser });

				const context = {
					identity: 'oauth-access-token',
					version: 1 as const,
					metadata: {
						source: 'n8n-oauth' as const,
						resource: 'https://host/mcp/workflow-a',
					},
				};

				const result = await identifier.resolve(context, {});

				expect(result).toBe('user-123');
				expect(mockOAuthVerifier.verifyOAuthAccessToken).toHaveBeenCalledWith(
					'oauth-access-token',
					'https://host/mcp/workflow-a',
				);
				expect(mockAuthService.authenticateUserByCookie).not.toHaveBeenCalled();
				expect(mockAuthService.authenticateUserBasedOnToken).not.toHaveBeenCalled();
			});

			it('should throw CredentialResolverError when the token resolves to no user', async () => {
				mockOAuthVerifier.verifyOAuthAccessToken.mockResolvedValue({
					user: null,
					context: { reason: 'invalid_token', auth_type: 'oauth' },
				});

				const context = {
					identity: 'wrong-audience-token',
					version: 1 as const,
					metadata: {
						source: 'n8n-oauth' as const,
						resource: 'https://host/mcp/workflow-b',
					},
				};

				await expect(identifier.resolve(context, {})).rejects.toThrow(CredentialResolverError);
			});
		});
	});
});
