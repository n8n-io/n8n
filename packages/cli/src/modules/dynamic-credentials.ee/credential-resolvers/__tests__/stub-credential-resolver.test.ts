import type { Logger } from '@n8n/backend-common';

import { testCredentialResolverContract, testHelpers } from './resolver-contract-tests';
import { StubCredentialResolver } from '../stub-credential-resolver';

describe('StubCredentialResolver', () => {
	let mockLogger: jest.Mocked<Logger>;

	beforeEach(() => {
		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as jest.Mocked<Logger>;
	});

	// Run the standard contract tests
	testCredentialResolverContract({
		createResolver: () => new StubCredentialResolver(mockLogger),
		validationTests: {
			validOptions: [
				['no options', {}], // No options
				['empty prefix', { prefix: '' }], // Empty prefix
				['with prefix', { prefix: 'test' }], // With prefix
				['complex prefix', { prefix: 'namespace:sub' }], // Complex prefix
			],
			invalidOptions: [
				['prefix must be string', { prefix: 123 }],
				['prefix cannot be null', { prefix: null }],
			],
		},
	});

	// Stub-specific tests (if any unique behavior needs testing)
	describe('stub-specific behavior', () => {
		it('should use prefix in key generation', async () => {
			const resolver = new StubCredentialResolver(mockLogger);
			const credentialId = 'cred-123';
			const context = testHelpers.createContext('user-1');
			const data = { apiKey: 'test-key' };

			const handleWithPrefix = testHelpers.createHandle({ prefix: 'test' });
			const handleWithOtherPrefix = testHelpers.createHandle({ prefix: 'other' });
			const handleWithoutPrefix = testHelpers.createHandle({});

			// Store with prefix
			await resolver.setSecret(credentialId, context, data, handleWithPrefix);

			// Should retrieve with same prefix
			const retrieved = await resolver.getSecret(credentialId, context, handleWithPrefix);
			expect(retrieved).toEqual(data);

			// Should NOT retrieve with different prefix
			await expect(
				resolver.getSecret(credentialId, context, handleWithOtherPrefix),
			).rejects.toThrow();

			// Should NOT retrieve without prefix
			await expect(
				resolver.getSecret(credentialId, context, handleWithoutPrefix),
			).rejects.toThrow();
		});

		it('should store data in memory (lost on restart)', async () => {
			const resolver1 = new StubCredentialResolver(mockLogger);
			const resolver2 = new StubCredentialResolver(mockLogger);

			const credentialId = 'cred-123';
			const context = testHelpers.createContext('user-1');
			const data = { apiKey: 'test-key' };
			const handle = testHelpers.createHandle({});

			// Store in first instance
			await resolver1.setSecret(credentialId, context, data, handle);

			// Should not be available in second instance (different memory)
			await expect(resolver2.getSecret(credentialId, context, handle)).rejects.toThrow();
		});
	});

	describe('validateIdentity', () => {
		it('should validate identity', async () => {
			const resolver = new StubCredentialResolver(mockLogger);
			const identity = 'test-identity';
			const handle = testHelpers.createHandle({});
			await expect(resolver.validateIdentity(identity, handle)).resolves.toBeUndefined();
		});
	});
});
