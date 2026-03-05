import { mock } from 'jest-mock-extended';

import { N8NIdentifier } from '../n8n-identifier';

import type { UserIdentityResolverService } from '@/auth/user-identity-resolver.service';

describe('N8NIdentifier', () => {
	let identifier: N8NIdentifier;
	let mockUserIdentityResolverService: jest.Mocked<UserIdentityResolverService>;

	beforeEach(() => {
		mockUserIdentityResolverService = mock<UserIdentityResolverService>();
		identifier = new N8NIdentifier(mockUserIdentityResolverService);
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
		it('should delegate to UserIdentityResolverService', async () => {
			mockUserIdentityResolverService.resolveUserId.mockResolvedValue('user-123');

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
			expect(mockUserIdentityResolverService.resolveUserId).toHaveBeenCalledWith(context);
		});

		it('should propagate errors from UserIdentityResolverService', async () => {
			mockUserIdentityResolverService.resolveUserId.mockRejectedValue(
				new Error('Authentication failed'),
			);

			const context = {
				identity: 'invalid-token',
				version: 1 as const,
				metadata: {
					method: 'GET',
					endpoint: '/api/users',
				},
			};

			await expect(identifier.resolve(context, {})).rejects.toThrow('Authentication failed');
		});
	});
});
