import type { User } from '@n8n/db';
import { CredentialResolverError } from '@n8n/decorators';
import { mock } from 'jest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { AuthError } from '@/errors/response-errors/auth.error';

import { N8NIdentifier } from '../n8n-identifier';

describe('N8NIdentifier', () => {
	let identifier: N8NIdentifier;
	let mockAuthService: jest.Mocked<AuthService>;

	const mockUser = mock<User>({ id: 'user-123' });

	beforeEach(() => {
		mockAuthService = mock<AuthService>();

		identifier = new N8NIdentifier(mockAuthService);
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
						method: 'POST',
						endpoint: '/api/workflows',
					},
				};

				await expect(identifier.resolve(context, {})).rejects.toThrow('Database connection failed');
			});
		});
	});
});
