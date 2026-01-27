import type { Logger } from '@n8n/backend-common';
import {
	CredentialResolverDataNotFoundError,
	CredentialResolverValidationError,
} from '@n8n/decorators';
import type { Cipher } from 'n8n-core';

import type { N8NIdentifier } from '../identifiers/n8n-identifier';
import { N8NCredentialResolver } from '../n8n-credential-resolver';
import type { DynamicCredentialUserEntryStorage } from '../storage/dynamic-credential-user-entry-storage';
import { testCredentialResolverContract, testHelpers } from './resolver-contract-tests';

describe('N8NCredentialResolver', () => {
	let mockLogger: jest.Mocked<Logger>;
	let mockIdentifier: jest.Mocked<N8NIdentifier>;
	let mockStorage: jest.Mocked<DynamicCredentialUserEntryStorage>;
	let mockCipher: jest.Mocked<Cipher>;

	beforeEach(() => {
		mockLogger = {
			debug: jest.fn(),
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
		} as unknown as jest.Mocked<Logger>;

		mockIdentifier = {
			resolve: jest.fn(),
			validateOptions: jest.fn(),
		} as unknown as jest.Mocked<N8NIdentifier>;

		mockStorage = {
			getCredentialData: jest.fn(),
			setCredentialData: jest.fn(),
			deleteCredentialData: jest.fn(),
			deleteAllCredentialData: jest.fn(),
		} as unknown as jest.Mocked<DynamicCredentialUserEntryStorage>;

		mockCipher = {
			encrypt: jest.fn(),
			decrypt: jest.fn(),
		} as unknown as jest.Mocked<Cipher>;
	});

	// Run the standard contract tests
	testCredentialResolverContract({
		createResolver: () => {
			// Create in-memory storage for contract tests
			const storage = new Map<string, string>();

			// Reset mocks with stateful implementations
			// Make identifier return different user IDs for different identities
			mockIdentifier.resolve.mockImplementation(async (context) => {
				return `user-${context.identity}`;
			});
			// N8N resolver has no actual validation, but contract tests require at least one "invalid" case
			// Mock validation to throw only for the placeholder test case
			mockIdentifier.validateOptions.mockImplementation(async (options) => {
				if (options && 'placeholder' in options) {
					throw new CredentialResolverValidationError(
						'Placeholder validation error for contract test',
					);
				}
				return undefined;
			});

			mockStorage.getCredentialData.mockImplementation(async (credentialId, userId, resolverId) => {
				const key = `${credentialId}:${userId}:${resolverId}`;
				return storage.get(key) ?? null;
			});

			mockStorage.setCredentialData.mockImplementation(
				async (credentialId, userId, resolverId, data) => {
					const key = `${credentialId}:${userId}:${resolverId}`;
					storage.set(key, data);
				},
			);

			mockStorage.deleteCredentialData.mockImplementation(
				async (credentialId, userId, resolverId) => {
					const key = `${credentialId}:${userId}:${resolverId}`;
					storage.delete(key);
				},
			);

			mockCipher.encrypt.mockImplementation((data) => JSON.stringify(data));
			mockCipher.decrypt.mockImplementation((data) => data);

			return new N8NCredentialResolver(mockLogger, mockIdentifier, mockStorage, mockCipher);
		},
		validationTests: {
			validOptions: [
				['empty config (no options required)', {}],
				['any config (ignored)', { foo: 'bar', baz: 123 }],
			],
			// Note: N8N resolver has no configuration validation, so no options are truly "invalid"
			// However, the contract test framework requires at least one test case for it.each()
			// This placeholder ensures the framework doesn't throw an error
			invalidOptions: [['placeholder (N8N resolver accepts all options)', { placeholder: true }]],
		},
	});

	// N8N-specific behavior tests
	describe('N8N-specific behavior', () => {
		let resolver: N8NCredentialResolver;

		beforeEach(() => {
			mockIdentifier.resolve.mockResolvedValue('user-123');
			mockIdentifier.validateOptions.mockResolvedValue(undefined);

			resolver = new N8NCredentialResolver(mockLogger, mockIdentifier, mockStorage, mockCipher);
		});

		describe('getSecret', () => {
			it('should use N8NIdentifier to resolve user ID from JWT', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('jwt-token-abc');
				const handle = testHelpers.createHandle({});

				mockStorage.getCredentialData.mockResolvedValue('encrypted-data');
				mockCipher.decrypt.mockReturnValue('{"apiKey":"secret-123"}');

				await resolver.getSecret(credentialId, context, handle);

				// Verify N8NIdentifier was called with correct context
				expect(mockIdentifier.resolve).toHaveBeenCalledWith(context, {});
				// Verify storage was queried with resolved user ID
				expect(mockStorage.getCredentialData).toHaveBeenCalledWith(
					credentialId,
					'user-123',
					handle.resolverId,
					{},
				);
			});

			it('should throw CredentialResolverDataNotFoundError when decrypted data is invalid JSON', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('jwt-token-abc');
				const handle = testHelpers.createHandle({});

				mockStorage.getCredentialData.mockResolvedValue('encrypted-data');
				mockCipher.decrypt.mockReturnValue('invalid-json{{{');

				await expect(resolver.getSecret(credentialId, context, handle)).rejects.toThrow(
					CredentialResolverDataNotFoundError,
				);

				expect(mockLogger.error).toHaveBeenCalledWith(
					'Failed to parse decrypted credential data',
					expect.any(Object),
				);
			});
		});

		describe('setSecret', () => {
			it('should encrypt data before storing', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('jwt-token-xyz');
				const data = testHelpers.createCredentialData({ apiKey: 'new-secret' });
				const handle = testHelpers.createHandle({});

				mockCipher.encrypt.mockReturnValue('encrypted-new-data');

				await resolver.setSecret(credentialId, context, data, handle);

				expect(mockCipher.encrypt).toHaveBeenCalledWith(data);
				expect(mockStorage.setCredentialData).toHaveBeenCalledWith(
					credentialId,
					'user-123',
					handle.resolverId,
					'encrypted-new-data',
					{},
				);
			});

			it('should use resolved user ID as storage key', async () => {
				const credentialId = 'cred-456';
				const context = testHelpers.createContext('jwt-token-xyz');
				const data = testHelpers.createCredentialData();
				const handle = testHelpers.createHandle({});

				mockIdentifier.resolve.mockResolvedValue('user-resolved-789');
				mockCipher.encrypt.mockReturnValue('encrypted-data');

				await resolver.setSecret(credentialId, context, data, handle);

				// Verify user ID was resolved first
				expect(mockIdentifier.resolve).toHaveBeenCalledWith(context, {});
				// Verify storage uses resolved user ID
				expect(mockStorage.setCredentialData).toHaveBeenCalledWith(
					credentialId,
					'user-resolved-789',
					handle.resolverId,
					'encrypted-data',
					{},
				);
			});
		});

		describe('deleteSecret', () => {
			it('should use resolved user ID for deletion', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('jwt-token-abc');
				const handle = testHelpers.createHandle({});

				mockIdentifier.resolve.mockResolvedValue('user-to-delete-456');

				await resolver.deleteSecret(credentialId, context, handle);

				expect(mockIdentifier.resolve).toHaveBeenCalledWith(context, {});
				expect(mockStorage.deleteCredentialData).toHaveBeenCalledWith(
					credentialId,
					'user-to-delete-456',
					handle.resolverId,
					{},
				);
			});
		});

		describe('deleteAllSecrets', () => {
			it('should delegate to storage.deleteAllCredentialData', async () => {
				const handle = testHelpers.createHandle({});

				await resolver.deleteAllSecrets(handle);

				expect(mockStorage.deleteAllCredentialData).toHaveBeenCalledWith(handle);
			});
		});

		describe('validateIdentity', () => {
			it('should validate JWT with browserId set to false', async () => {
				const identity = 'jwt-token-to-validate';
				const handle = testHelpers.createHandle({});

				await resolver.validateIdentity(identity, handle);

				// Verify N8NIdentifier was called with browserId=false
				expect(mockIdentifier.resolve).toHaveBeenCalledWith(
					{
						identity: 'jwt-token-to-validate',
						version: 1,
						metadata: {
							browserId: false,
						},
					},
					{},
				);
			});
		});
	});
});
