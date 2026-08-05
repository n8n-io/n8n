import type { Mocked } from 'vitest';
import type { User } from '@n8n/db';
import { CredentialResolverDataNotFoundError, CredentialResolverError } from '@n8n/decorators';
import type { IVerifiedClaim } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { AuthError } from '@/errors/response-errors/auth.error';
import type { IdentityResolutionProxy } from '@/services/identity-resolution-proxy.service';
import type { OAuthTokenVerifierProxy } from '@/services/oauth-token-verifier-proxy.service';

import { N8NIdentifier } from '../n8n-identifier';

describe('N8NIdentifier', () => {
	let identifier: N8NIdentifier;
	let mockAuthService: Mocked<AuthService>;
	let mockOAuthVerifier: Mocked<OAuthTokenVerifierProxy>;
	let mockIdentityResolution: Mocked<IdentityResolutionProxy>;

	const mockUser = mock<User>({ id: 'user-123' });

	const claim: IVerifiedClaim = {
		version: 1,
		sourceId: 'source-1',
		issuer: 'https://idp.example.com',
		subject: 'external-subject-1',
		audience: 'https://n8n.example.com',
		expiresAt: Date.now() + 60_000,
		boundWorkflowId: 'workflow-1',
	};

	const externalIdpContext = (claims?: IVerifiedClaim) => ({
		identity: '',
		version: 1 as const,
		metadata: { source: 'external-idp' as const },
		claims,
	});

	beforeEach(() => {
		mockAuthService = mock<AuthService>();
		mockOAuthVerifier = mock<OAuthTokenVerifierProxy>();
		mockIdentityResolution = mock<IdentityResolutionProxy>();

		identifier = new N8NIdentifier(mockAuthService, mockOAuthVerifier, mockIdentityResolution);
	});

	afterEach(() => {
		vi.clearAllMocks();
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

		describe('external-idp branch', () => {
			it('should resolve the principal from the claim on every access', async () => {
				mockIdentityResolution.resolve.mockResolvedValue(mockUser);

				const result = await identifier.resolve(externalIdpContext(claim), {});

				expect(result).toBe('user-123');
				expect(mockIdentityResolution.resolve).toHaveBeenCalledWith(
					{ iss: 'https://idp.example.com', sub: 'external-subject-1' },
					undefined,
					{ issuer: 'https://idp.example.com' },
					false,
				);
				expect(mockAuthService.authenticateUserByCookie).not.toHaveBeenCalled();
				expect(mockAuthService.authenticateUserBasedOnToken).not.toHaveBeenCalled();
				expect(mockOAuthVerifier.verifyOAuthAccessToken).not.toHaveBeenCalled();
			});

			it('should never allow provisioning from an inbound trigger', async () => {
				mockIdentityResolution.resolve.mockResolvedValue(mockUser);

				await identifier.resolve(externalIdpContext(claim), {});

				const allowProvisioning = mockIdentityResolution.resolve.mock.calls[0][3];
				expect(allowProvisioning).toBe(false);
			});

			it('should re-resolve on each access rather than caching the principal', async () => {
				mockIdentityResolution.resolve.mockResolvedValue(mockUser);
				const context = externalIdpContext(claim);

				await identifier.resolve(context, {});
				await identifier.resolve(context, {});
				await identifier.resolve(context, {});

				expect(mockIdentityResolution.resolve).toHaveBeenCalledTimes(3);
			});

			it('should stop resolving once the binding is revoked mid-execution', async () => {
				mockIdentityResolution.resolve.mockResolvedValueOnce(mockUser);
				const context = externalIdpContext(claim);

				await expect(identifier.resolve(context, {})).resolves.toBe('user-123');

				// Binding revoked between accesses: read-only resolution returns null.
				mockIdentityResolution.resolve.mockResolvedValue(null);

				await expect(identifier.resolve(context, {})).rejects.toThrow(
					CredentialResolverDataNotFoundError,
				);
			});

			it('should still resolve when the claim has outlived the token expiry', async () => {
				mockIdentityResolution.resolve.mockResolvedValue(mockUser);
				const expiredClaim = { ...claim, expiresAt: Date.now() - 60_000 };

				await expect(identifier.resolve(externalIdpContext(expiredClaim), {})).resolves.toBe(
					'user-123',
				);
			});

			it('should report as unconnected when the context carries no claim', async () => {
				await expect(identifier.resolve(externalIdpContext(undefined), {})).rejects.toThrow(
					CredentialResolverDataNotFoundError,
				);
				expect(mockIdentityResolution.resolve).not.toHaveBeenCalled();
			});

			it('should report as unconnected when no binding exists for the claim', async () => {
				mockIdentityResolution.resolve.mockResolvedValue(null);

				await expect(identifier.resolve(externalIdpContext(claim), {})).rejects.toThrow(
					CredentialResolverDataNotFoundError,
				);
			});
		});
	});
});
