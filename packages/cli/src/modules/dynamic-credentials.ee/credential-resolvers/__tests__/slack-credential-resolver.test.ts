import type { Logger } from '@n8n/backend-common';
import type { Cipher } from 'n8n-core';

import { testCredentialResolverContract, testHelpers } from './resolver-contract-tests';
import type { SlackIdentifier } from '../identifiers/slack-identifier';
import { SlackCredentialResolver } from '../slack-credential-resolver';
import type { DynamicCredentialEntryStorage } from '../storage/dynamic-credential-entry-storage';

describe('SlackCredentialResolver', () => {
	let mockLogger: jest.Mocked<Logger>;
	let mockIdentifier: jest.Mocked<SlackIdentifier>;
	let mockStorage: jest.Mocked<DynamicCredentialEntryStorage>;
	let mockCipher: jest.Mocked<Cipher>;

	const slackRequestOptions = {
		validation: 'slack-request' as const,
	};

	const slackAuthTestOptions = {
		validation: 'slack-auth-test' as const,
		subjectClaim: 'user_id',
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
		} as unknown as jest.Mocked<SlackIdentifier>;

		mockStorage = {
			getCredentialData: jest.fn(),
			setCredentialData: jest.fn(),
			deleteCredentialData: jest.fn(),
			deleteAllCredentialData: jest.fn(),
		} as unknown as jest.Mocked<DynamicCredentialEntryStorage>;

		mockCipher = {
			encrypt: jest.fn(),
			decrypt: jest.fn(),
		} as unknown as jest.Mocked<Cipher>;
	});

	// Run the standard contract tests
	testCredentialResolverContract({
		createResolver: () => {
			const storage = new Map<string, string>();

			mockIdentifier.resolve.mockImplementation(async (context) => {
				return `slack-user-${context.identity}`;
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

			return new SlackCredentialResolver(mockLogger, mockIdentifier, mockStorage, mockCipher);
		},
		validationTests: {
			validOptions: [
				['slack-request mode', slackRequestOptions],
				['slack-auth-test mode', slackAuthTestOptions],
				['slack-auth-test with custom claim', { ...slackAuthTestOptions, subjectClaim: 'team_id' }],
			],
			invalidOptions: [
				['missing validation field', {}],
				['invalid validation value', { validation: 'invalid' }],
			],
		},
	});

	// Slack-specific behavior tests
	describe('Slack-specific behavior', () => {
		let resolver: SlackCredentialResolver;

		beforeEach(() => {
			mockIdentifier.resolve.mockResolvedValue('U12345678');
			mockIdentifier.validateOptions.mockResolvedValue(undefined);
			resolver = new SlackCredentialResolver(mockLogger, mockIdentifier, mockStorage, mockCipher);
		});

		describe('getSecret', () => {
			it('should use SlackIdentifier to resolve user ID', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('U0A293J0RFV');
				const handle = testHelpers.createHandle(slackRequestOptions);

				mockStorage.getCredentialData.mockResolvedValue('encrypted-credential-data');
				mockCipher.decrypt.mockReturnValue('{"apiKey":"decrypted-key"}');

				await resolver.getSecret(credentialId, context, handle);

				expect(mockIdentifier.resolve).toHaveBeenCalledWith(context, slackRequestOptions);
			});

			it('should decrypt data retrieved from storage', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('U0A293J0RFV');
				const handle = testHelpers.createHandle(slackRequestOptions);

				mockStorage.getCredentialData.mockResolvedValue('encrypted-data-from-db');
				mockCipher.decrypt.mockReturnValue('{"apiKey":"secret-key-123"}');

				const result = await resolver.getSecret(credentialId, context, handle);

				expect(mockCipher.decrypt).toHaveBeenCalledWith('encrypted-data-from-db');
				expect(result).toEqual({ apiKey: 'secret-key-123' });
			});

			it('should throw when decrypted data is not valid JSON', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('U0A293J0RFV');
				const handle = testHelpers.createHandle(slackRequestOptions);

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
				const context = testHelpers.createContext('U0A293J0RFV');
				const data = testHelpers.createCredentialData({ apiKey: 'new-key' });
				const handle = testHelpers.createHandle(slackRequestOptions);

				mockCipher.encrypt.mockReturnValue('encrypted-new-data');

				await resolver.setSecret(credentialId, context, data, handle);

				expect(mockCipher.encrypt).toHaveBeenCalledWith(data);
				expect(mockStorage.setCredentialData).toHaveBeenCalledWith(
					credentialId,
					'U12345678',
					handle.resolverId,
					'encrypted-new-data',
					slackRequestOptions,
				);
			});
		});

		describe('deleteSecret', () => {
			it('should use resolved Slack user ID for deletion', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('U0A293J0RFV');
				const handle = testHelpers.createHandle(slackRequestOptions);

				mockIdentifier.resolve.mockResolvedValue('U-to-delete');

				await resolver.deleteSecret(credentialId, context, handle);

				expect(mockStorage.deleteCredentialData).toHaveBeenCalledWith(
					credentialId,
					'U-to-delete',
					handle.resolverId,
					slackRequestOptions,
				);
			});
		});

		describe('deleteAllSecrets', () => {
			it('should delegate to storage.deleteAllCredentialData', async () => {
				const handle = testHelpers.createHandle(slackRequestOptions);

				await resolver.deleteAllSecrets(handle);

				expect(mockStorage.deleteAllCredentialData).toHaveBeenCalledWith(handle);
			});
		});

		describe('validateOptions', () => {
			it('should delegate validation to SlackIdentifier', async () => {
				await resolver.validateOptions(slackRequestOptions);

				expect(mockIdentifier.validateOptions).toHaveBeenCalledWith(slackRequestOptions);
			});
		});

		describe('validation mode routing', () => {
			it('should pass slack-request options to identifier', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('U0A293J0RFV');
				const handle = testHelpers.createHandle(slackRequestOptions);

				mockStorage.getCredentialData.mockResolvedValue('encrypted-data');
				mockCipher.decrypt.mockReturnValue('{"apiKey":"test"}');

				await resolver.getSecret(credentialId, context, handle);

				expect(mockIdentifier.resolve).toHaveBeenCalledWith(context, slackRequestOptions);
			});

			it('should pass slack-auth-test options to identifier', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('xoxp-some-token');
				const handle = testHelpers.createHandle(slackAuthTestOptions);

				mockStorage.getCredentialData.mockResolvedValue('encrypted-data');
				mockCipher.decrypt.mockReturnValue('{"apiKey":"test"}');

				await resolver.getSecret(credentialId, context, handle);

				expect(mockIdentifier.resolve).toHaveBeenCalledWith(context, slackAuthTestOptions);
			});
		});

		describe('isolation with different Slack users', () => {
			it('should store credentials for different Slack users separately', async () => {
				const credentialId = 'cred-123';
				const handle = testHelpers.createHandle(slackRequestOptions);

				mockIdentifier.resolve.mockImplementation(async (context) => {
					return context.identity;
				});

				const data1 = testHelpers.createCredentialData({ apiKey: 'key-1' });
				const data2 = testHelpers.createCredentialData({ apiKey: 'key-2' });

				mockCipher.encrypt.mockReturnValue('encrypted');

				await resolver.setSecret(credentialId, testHelpers.createContext('U111'), data1, handle);
				await resolver.setSecret(credentialId, testHelpers.createContext('U222'), data2, handle);

				expect(mockStorage.setCredentialData).toHaveBeenCalledWith(
					credentialId,
					'U111',
					handle.resolverId,
					'encrypted',
					slackRequestOptions,
				);
				expect(mockStorage.setCredentialData).toHaveBeenCalledWith(
					credentialId,
					'U222',
					handle.resolverId,
					'encrypted',
					slackRequestOptions,
				);
			});
		});
	});
});
