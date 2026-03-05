import type { User } from '@n8n/db';
import { CredentialResolverError } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { AuthError } from '@/errors/response-errors/auth.error';

import { UserIdentityResolverService } from '../user-identity-resolver.service';

describe('UserIdentityResolverService', () => {
	let service: UserIdentityResolverService;
	let mockAuthService: jest.Mocked<AuthService>;

	const mockUser = mock<User>({ id: 'user-123' });

	beforeEach(() => {
		mockAuthService = mock<AuthService>();
		service = new UserIdentityResolverService(mockAuthService);
	});

	afterEach(() => {
		jest.clearAllMocks();
	});

	describe('resolveUserId', () => {
		it('should resolve user ID with browserId string', async () => {
			mockAuthService.authenticateUserBasedOnToken.mockResolvedValue(mockUser);

			const context = {
				identity: 'valid-jwt-token',
				version: 1 as const,
				metadata: {
					method: 'GET',
					endpoint: '/api/users',
					browserId: 'browser-abc',
				},
			};

			const result = await service.resolveUserId(context);

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
					method: 'POST',
					endpoint: '/api/workflows',
					browserId: undefined,
				},
			};

			const result = await service.resolveUserId(context);

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
					method: 'DELETE',
					endpoint: '/api/credentials',
				},
			};

			const result = await service.resolveUserId(context);

			expect(result).toBe('user-123');
			expect(mockAuthService.authenticateUserBasedOnToken).toHaveBeenCalledWith(
				'valid-jwt-token',
				'DELETE',
				'/api/credentials',
				undefined,
			);
		});

		it('should throw CredentialResolverError when metadata is missing', async () => {
			const context = {
				identity: 'valid-jwt-token',
				version: 1 as const,
				metadata: undefined,
			};

			await expect(service.resolveUserId(context)).rejects.toThrow(CredentialResolverError);
			expect(mockAuthService.authenticateUserBasedOnToken).not.toHaveBeenCalled();
		});

		it('should throw CredentialResolverError when browserId has invalid type', async () => {
			const context = {
				identity: 'valid-jwt-token',
				version: 1 as const,
				metadata: {
					method: 'GET',
					endpoint: '/api/users',
					browserId: 123, // Number instead of string
				},
			};

			await expect(service.resolveUserId(context)).rejects.toThrow(
				expect.objectContaining({
					message: expect.stringMatching(/Invalid context metadata/),
				}),
			);
			expect(mockAuthService.authenticateUserBasedOnToken).not.toHaveBeenCalled();
		});

		it('should propagate AuthError when token is invalid', async () => {
			const authError = new AuthError('Unauthorized');
			mockAuthService.authenticateUserBasedOnToken.mockRejectedValue(authError);

			const context = {
				identity: 'invalid-token',
				version: 1 as const,
				metadata: {
					method: 'GET',
					endpoint: '/api/users',
					browserId: 'browser-abc',
				},
			};

			await expect(service.resolveUserId(context)).rejects.toThrow('Unauthorized');
		});

		it('should propagate error when authentication fails', async () => {
			const genericError = new Error('Database connection failed');
			mockAuthService.authenticateUserBasedOnToken.mockRejectedValue(genericError);

			const context = {
				identity: 'valid-token',
				version: 1 as const,
				metadata: {
					method: 'POST',
					endpoint: '/api/workflows',
				},
			};

			await expect(service.resolveUserId(context)).rejects.toThrow('Database connection failed');
		});
	});
});
