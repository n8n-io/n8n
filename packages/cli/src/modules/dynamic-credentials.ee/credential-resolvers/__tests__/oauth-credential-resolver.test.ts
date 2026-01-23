import type { Logger } from '@n8n/backend-common';
import type { Cipher } from 'n8n-core';

import { testCredentialResolverContract, testHelpers } from './resolver-contract-tests';
import type { OAuth2TokenIntrospectionIdentifier } from '../identifiers/oauth2-introspection-identifier';
import type { OAuth2UserInfoIdentifier } from '../identifiers/oauth2-userinfo-identifier';
import { OAuthCredentialResolver } from '../oauth-credential-resolver';
import type { DynamicCredentialEntryStorage } from '../storage/dynamic-credential-entry-storage';

describe('OAuthCredentialResolver', () => {
	let mockLogger: jest.Mocked<Logger>;
	let mockIdentifier: jest.Mocked<OAuth2TokenIntrospectionIdentifier>;
	let mockIdentifierUserInfo: jest.Mocked<OAuth2UserInfoIdentifier>;
	let mockStorage: jest.Mocked<DynamicCredentialEntryStorage>;
	let mockCipher: jest.Mocked<Cipher>;

	const validOptions = {
		metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
		clientId: 'test-client-id',
		clientSecret: 'test-client-secret',
		subjectClaim: 'sub',
		validation: 'oauth2-introspection',
	};

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
		} as unknown as jest.Mocked<OAuth2TokenIntrospectionIdentifier>;

		mockIdentifierUserInfo = {
			resolve: jest.fn(),
			validateOptions: jest.fn(),
		} as unknown as jest.Mocked<OAuth2UserInfoIdentifier>;

		mockStorage = {
			getCredentialData: jest.fn(),
			setCredentialData: jest.fn(),
			deleteCredentialData: jest.fn(),
		} as unknown as jest.Mocked<DynamicCredentialEntryStorage>;

		mockCipher = {
			encrypt: jest.fn(),
			decrypt: jest.fn(),
		} as unknown as jest.Mocked<Cipher>;
	});

	// Run the standard contract tests
	testCredentialResolverContract({
		createResolver: () => {
			// Create an in-memory storage for contract tests
			const storage = new Map<string, string>();

			// Reset mocks with stateful implementations
			// Make identifier return different subjects for different identities
			mockIdentifier.resolve.mockImplementation(async (context) => {
				return `subject-${context.identity}`;
			});
			mockIdentifier.validateOptions.mockResolvedValue(undefined);

			mockStorage.getCredentialData.mockImplementation(
				async (credentialId, subjectId, resolverId) => {
					const key = `${credentialId}:${subjectId}:${resolverId}`;
					return storage.get(key) ?? null;
				},
			);

			mockStorage.setCredentialData.mockImplementation(
				async (credentialId, subjectId, resolverId, data) => {
					const key = `${credentialId}:${subjectId}:${resolverId}`;
					storage.set(key, data);
				},
			);

			mockStorage.deleteCredentialData.mockImplementation(
				async (credentialId, subjectId, resolverId) => {
					const key = `${credentialId}:${subjectId}:${resolverId}`;
					storage.delete(key);
				},
			);

			mockCipher.encrypt.mockImplementation((data) => JSON.stringify(data));
			mockCipher.decrypt.mockImplementation((data) => data);

			return new OAuthCredentialResolver(
				mockLogger,
				mockIdentifier,
				mockIdentifierUserInfo,
				mockStorage,
				mockCipher,
			);
		},
		validationTests: {
			validOptions: [
				['complete OAuth config', validOptions],
				['with custom subject claim', { ...validOptions, subjectClaim: 'email' }],
				[
					'minimal config (subjectClaim defaults to "sub")',
					{
						metadataUri: validOptions.metadataUri,
						clientId: validOptions.clientId,
						clientSecret: validOptions.clientSecret,
						validation: 'oauth2-introspection',
					},
				],
				[
					'alternative validation',
					{
						metadataUri: validOptions.metadataUri,
						clientId: validOptions.clientId,
						clientSecret: validOptions.clientSecret,
						validation: 'oauth2-userinfo',
					},
				],
			],
			invalidOptions: [
				['missing metadataUri', { clientId: 'x', clientSecret: 'y' }],
				['missing clientId', { metadataUri: validOptions.metadataUri, clientSecret: 'y' }],
				['missing clientSecret', { metadataUri: validOptions.metadataUri, clientId: 'x' }],
				[
					'invalid metadataUri (not a URL)',
					{ metadataUri: 'not-a-url', clientId: 'x', clientSecret: 'y' },
				],
			],
		},
	});

	// OAuth-specific behavior tests
	describe('OAuth-specific behavior', () => {
		let resolver: OAuthCredentialResolver;

		beforeEach(() => {
			mockIdentifier.resolve.mockResolvedValue('oauth-subject-123');
			mockIdentifier.validateOptions.mockResolvedValue(undefined);
			resolver = new OAuthCredentialResolver(
				mockLogger,
				mockIdentifier,
				mockIdentifierUserInfo,
				mockStorage,
				mockCipher,
			);
		});

		describe('getSecret', () => {
			it('should use identifier to resolve subject from token', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('access-token-xyz');
				const handle = testHelpers.createHandle(validOptions);

				mockStorage.getCredentialData.mockResolvedValue('encrypted-credential-data');
				mockCipher.decrypt.mockReturnValue('{"apiKey":"decrypted-key"}');

				await resolver.getSecret(credentialId, context, handle);

				expect(mockIdentifier.resolve).toHaveBeenCalledWith(context, validOptions);
			});

			it('should decrypt data retrieved from storage', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('access-token-xyz');
				const handle = testHelpers.createHandle(validOptions);

				mockStorage.getCredentialData.mockResolvedValue('encrypted-data-from-db');
				mockCipher.decrypt.mockReturnValue('{"apiKey":"secret-key-123"}');

				const result = await resolver.getSecret(credentialId, context, handle);

				expect(mockCipher.decrypt).toHaveBeenCalledWith('encrypted-data-from-db');
				expect(result).toEqual({ apiKey: 'secret-key-123' });
			});

			it('should throw when decrypted data is not valid JSON', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('access-token-xyz');
				const handle = testHelpers.createHandle(validOptions);

				mockStorage.getCredentialData.mockResolvedValue('encrypted-data');
				mockCipher.decrypt.mockReturnValue('invalid-json{{{');

				await expect(resolver.getSecret(credentialId, context, handle)).rejects.toThrow();
				expect(mockLogger.error).toHaveBeenCalledWith(
					'Failed to parse decrypted credential data',
					expect.any(Object),
				);
			});
		});

		describe('setSecret', () => {
			it('should encrypt data before storing', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('access-token-xyz');
				const data = testHelpers.createCredentialData({ apiKey: 'new-key' });
				const handle = testHelpers.createHandle(validOptions);

				mockCipher.encrypt.mockReturnValue('encrypted-new-data');

				await resolver.setSecret(credentialId, context, data, handle);

				expect(mockCipher.encrypt).toHaveBeenCalledWith(data);
				expect(mockStorage.setCredentialData).toHaveBeenCalledWith(
					credentialId,
					'oauth-subject-123',
					handle.resolverId,
					'encrypted-new-data',
					validOptions,
				);
			});

			it('should use resolved subject as storage key', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('access-token-xyz');
				const data = testHelpers.createCredentialData();
				const handle = testHelpers.createHandle(validOptions);

				mockIdentifier.resolve.mockResolvedValue('resolved-subject-456');
				mockCipher.encrypt.mockReturnValue('encrypted-data');

				await resolver.setSecret(credentialId, context, data, handle);

				expect(mockStorage.setCredentialData).toHaveBeenCalledWith(
					credentialId,
					'resolved-subject-456',
					handle.resolverId,
					'encrypted-data',
					validOptions,
				);
			});
		});

		describe('deleteSecret', () => {
			it('should use resolved subject for deletion', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('access-token-xyz');
				const handle = testHelpers.createHandle(validOptions);

				mockIdentifier.resolve.mockResolvedValue('subject-to-delete');

				await resolver.deleteSecret(credentialId, context, handle);

				expect(mockIdentifier.resolve).toHaveBeenCalledWith(context, validOptions);
				expect(mockStorage.deleteCredentialData).toHaveBeenCalledWith(
					credentialId,
					'subject-to-delete',
					handle.resolverId,
					validOptions,
				);
			});
		});

		describe('validateOptions', () => {
			it('should delegate validation to identifier', async () => {
				await resolver.validateOptions(validOptions);

				expect(mockIdentifier.validateOptions).toHaveBeenCalledWith(validOptions);
			});

			it('should throw when identifier validation fails', async () => {
				mockIdentifier.validateOptions.mockRejectedValue(new Error('Invalid metadata'));

				await expect(resolver.validateOptions(validOptions)).rejects.toThrow('Invalid metadata');
			});
		});

		describe('isolation with different tokens', () => {
			it('should store credentials for different tokens separately', async () => {
				const credentialId = 'cred-123';
				const token1 = 'token-user-1';
				const token2 = 'token-user-2';
				const handle = testHelpers.createHandle(validOptions);

				// Mock identifier to return different subjects for different tokens
				mockIdentifier.resolve.mockImplementation(async (context) => {
					if (context.identity === token1) return 'subject-1';
					if (context.identity === token2) return 'subject-2';
					return 'unknown';
				});

				const data1 = testHelpers.createCredentialData({ apiKey: 'key-1' });
				const data2 = testHelpers.createCredentialData({ apiKey: 'key-2' });

				mockCipher.encrypt.mockReturnValue('encrypted');

				await resolver.setSecret(credentialId, testHelpers.createContext(token1), data1, handle);
				await resolver.setSecret(credentialId, testHelpers.createContext(token2), data2, handle);

				// Verify both were stored with different subjects
				expect(mockStorage.setCredentialData).toHaveBeenCalledWith(
					credentialId,
					'subject-1',
					handle.resolverId,
					'encrypted',
					validOptions,
				);
				expect(mockStorage.setCredentialData).toHaveBeenCalledWith(
					credentialId,
					'subject-2',
					handle.resolverId,
					'encrypted',
					validOptions,
				);
			});
		});

		describe('identifier routing', () => {
			it('should use introspection identifier when validation is oauth2-introspection', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('access-token-xyz');
				const introspectionOptions = {
					metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
					clientId: 'test-client',
					clientSecret: 'test-secret',
					subjectClaim: 'sub',
					validation: 'oauth2-introspection' as const,
				};
				const handle = testHelpers.createHandle(introspectionOptions);

				mockIdentifier.resolve.mockResolvedValue('introspection-subject-123');
				mockIdentifier.validateOptions.mockResolvedValue(undefined);
				mockStorage.getCredentialData.mockResolvedValue('encrypted-data');
				mockCipher.decrypt.mockReturnValue('{"apiKey":"test-key"}');

				await resolver.getSecret(credentialId, context, handle);

				expect(mockIdentifier.resolve).toHaveBeenCalledWith(context, introspectionOptions);
				expect(mockIdentifierUserInfo.resolve).not.toHaveBeenCalled();
			});

			it('should use userinfo identifier when validation is oauth2-userinfo', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('access-token-xyz');
				const userInfoOptions = {
					metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
					subjectClaim: 'sub',
					validation: 'oauth2-userinfo' as const,
				};
				const handle = testHelpers.createHandle(userInfoOptions);

				mockIdentifierUserInfo.resolve.mockResolvedValue('userinfo-subject-456');
				mockIdentifierUserInfo.validateOptions.mockResolvedValue(undefined);
				mockStorage.getCredentialData.mockResolvedValue('encrypted-data');
				mockCipher.decrypt.mockReturnValue('{"apiKey":"test-key"}');

				await resolver.getSecret(credentialId, context, handle);

				expect(mockIdentifierUserInfo.resolve).toHaveBeenCalledWith(context, userInfoOptions);
				expect(mockIdentifier.resolve).not.toHaveBeenCalled();
			});

			it('should route validateOptions to correct identifier based on validation method', async () => {
				const introspectionOptions = {
					metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
					clientId: 'test-client',
					clientSecret: 'test-secret',
					subjectClaim: 'sub',
					validation: 'oauth2-introspection' as const,
				};

				const userInfoOptions = {
					metadataUri: 'https://auth.example.com/.well-known/openid-configuration',
					subjectClaim: 'sub',
					validation: 'oauth2-userinfo' as const,
				};

				mockIdentifier.validateOptions.mockResolvedValue(undefined);
				mockIdentifierUserInfo.validateOptions.mockResolvedValue(undefined);

				await resolver.validateOptions(introspectionOptions);
				expect(mockIdentifier.validateOptions).toHaveBeenCalledWith(introspectionOptions);
				expect(mockIdentifierUserInfo.validateOptions).not.toHaveBeenCalled();

				jest.clearAllMocks();

				await resolver.validateOptions(userInfoOptions);
				expect(mockIdentifierUserInfo.validateOptions).toHaveBeenCalledWith(userInfoOptions);
				expect(mockIdentifier.validateOptions).not.toHaveBeenCalled();
			});
		});
	});
});
