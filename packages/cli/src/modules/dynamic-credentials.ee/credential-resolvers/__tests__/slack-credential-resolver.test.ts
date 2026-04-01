import type { Logger } from '@n8n/backend-common';
import type { Cipher } from 'n8n-core';

import { testCredentialResolverContract, testHelpers } from './resolver-contract-tests';
import type { SlackSignatureIdentifier } from '../identifiers/slack-signature-identifier';
import { SlackCredentialResolver } from '../slack-credential-resolver';
import type { DynamicCredentialEntryStorage } from '../storage/dynamic-credential-entry-storage';

describe('SlackCredentialResolver', () => {
	let mockLogger: jest.Mocked<Logger>;
	let mockIdentifier: jest.Mocked<SlackSignatureIdentifier>;
	let mockStorage: jest.Mocked<DynamicCredentialEntryStorage>;
	let mockCipher: jest.Mocked<Cipher>;

	const validOptions = {
		signingSecret: 'test-slack-signing-secret-abc123',
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
			resolveKey: jest.fn(),
			validateOptions: jest.fn(),
		} as unknown as jest.Mocked<SlackSignatureIdentifier>;

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
				return `slack-${context.identity}`;
			});
			mockIdentifier.resolveKey.mockImplementation((context) => {
				return `slack-${context.identity}`;
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
				['complete Slack config', validOptions],
				['with team_user subject claim', { ...validOptions, subjectClaim: 'team_user' }],
				[
					'minimal config (subjectClaim defaults to user_id)',
					{ signingSecret: validOptions.signingSecret },
				],
			],
			invalidOptions: [
				['missing signingSecret', { subjectClaim: 'user_id' }],
				['empty signingSecret', { signingSecret: '', subjectClaim: 'user_id' }],
				['invalid subjectClaim', { signingSecret: 'secret', subjectClaim: 'invalid_claim' }],
			],
		},
	});

	// Slack-specific behavior tests
	describe('Slack-specific behavior', () => {
		let resolver: SlackCredentialResolver;

		beforeEach(() => {
			mockIdentifier.resolve.mockResolvedValue('U12345');
			mockIdentifier.resolveKey.mockReturnValue('U12345');
			mockIdentifier.validateOptions.mockResolvedValue(undefined);
			resolver = new SlackCredentialResolver(mockLogger, mockIdentifier, mockStorage, mockCipher);
		});

		describe('getSecret', () => {
			it('should use identifier to resolve subject from Slack identity', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('U12345');
				const handle = testHelpers.createHandle(validOptions);

				mockStorage.getCredentialData.mockResolvedValue('encrypted-credential-data');
				mockCipher.decrypt.mockReturnValue('{"apiKey":"decrypted-key"}');

				await resolver.getSecret(credentialId, context, handle);

				expect(mockIdentifier.resolve).toHaveBeenCalledWith(context, validOptions);
			});

			it('should decrypt data retrieved from storage', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('U12345');
				const handle = testHelpers.createHandle(validOptions);

				mockStorage.getCredentialData.mockResolvedValue('encrypted-data-from-db');
				mockCipher.decrypt.mockReturnValue('{"apiKey":"secret-key-123"}');

				const result = await resolver.getSecret(credentialId, context, handle);

				expect(mockCipher.decrypt).toHaveBeenCalledWith('encrypted-data-from-db');
				expect(result).toEqual({ apiKey: 'secret-key-123' });
			});

			it('should throw when decrypted data is not valid JSON', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('U12345');
				const handle = testHelpers.createHandle(validOptions);

				mockStorage.getCredentialData.mockResolvedValue('encrypted-data');
				mockCipher.decrypt.mockReturnValue('invalid-json{{{');

				await expect(resolver.getSecret(credentialId, context, handle)).rejects.toThrow();
				expect(mockLogger.error).toHaveBeenCalledWith('Failed to decrypt or parse credential data');
			});

			it('should throw CredentialResolverDataNotFoundError when decryption fails', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('U12345');
				const handle = testHelpers.createHandle(validOptions);

				mockStorage.getCredentialData.mockResolvedValue('corrupted-encrypted-data');
				mockCipher.decrypt.mockImplementation(() => {
					throw new Error('ERR_OSSL_BAD_DECRYPT');
				});

				await expect(resolver.getSecret(credentialId, context, handle)).rejects.toThrow();
				expect(mockLogger.error).toHaveBeenCalledWith('Failed to decrypt or parse credential data');
			});
		});

		describe('setSecret', () => {
			it('should encrypt data before storing', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('U12345');
				const data = testHelpers.createCredentialData({ apiKey: 'new-key' });
				const handle = testHelpers.createHandle(validOptions);

				mockCipher.encrypt.mockReturnValue('encrypted-new-data');

				await resolver.setSecret(credentialId, context, data, handle);

				expect(mockCipher.encrypt).toHaveBeenCalledWith(data);
				expect(mockStorage.setCredentialData).toHaveBeenCalledWith(
					credentialId,
					'U12345',
					handle.resolverId,
					'encrypted-new-data',
					validOptions,
				);
			});
		});

		describe('deleteSecret', () => {
			it('should use resolved subject for deletion', async () => {
				const credentialId = 'cred-123';
				const context = testHelpers.createContext('U12345');
				const handle = testHelpers.createHandle(validOptions);

				mockIdentifier.resolve.mockResolvedValue('U12345');

				await resolver.deleteSecret(credentialId, context, handle);

				expect(mockIdentifier.resolve).toHaveBeenCalledWith(context, validOptions);
				expect(mockStorage.deleteCredentialData).toHaveBeenCalledWith(
					credentialId,
					'U12345',
					handle.resolverId,
					validOptions,
				);
			});
		});

		describe('deleteAllSecrets', () => {
			it('should delegate to storage', async () => {
				const handle = testHelpers.createHandle(validOptions);

				await resolver.deleteAllSecrets(handle);

				expect(mockStorage.deleteAllCredentialData).toHaveBeenCalledWith(handle);
			});
		});

		describe('validateIdentity', () => {
			it('should re-verify Slack identity via identifier', async () => {
				const context = {
					identity: 'U12345',
					version: 1 as const,
					metadata: {
						source: 'slack-signature',
						team_id: 'T67890',
						rawBody: 'user_id=U12345',
						timestamp: '1234567890',
						signature: 'v0=abc',
					},
				};
				const handle = testHelpers.createHandle(validOptions);

				await resolver.validateIdentity(context, handle);

				expect(mockIdentifier.resolve).toHaveBeenCalledWith(context, validOptions);
			});
		});

		describe('isolation with different Slack users', () => {
			it('should store credentials for different users separately', async () => {
				const credentialId = 'cred-123';
				const handle = testHelpers.createHandle(validOptions);

				mockIdentifier.resolveKey.mockImplementation((context) => {
					return context.identity; // user_id directly
				});

				const data1 = testHelpers.createCredentialData({ apiKey: 'key-user1' });
				const data2 = testHelpers.createCredentialData({ apiKey: 'key-user2' });

				mockCipher.encrypt.mockReturnValue('encrypted');

				await resolver.setSecret(credentialId, testHelpers.createContext('U11111'), data1, handle);
				await resolver.setSecret(credentialId, testHelpers.createContext('U22222'), data2, handle);

				expect(mockStorage.setCredentialData).toHaveBeenCalledWith(
					credentialId,
					'U11111',
					handle.resolverId,
					'encrypted',
					validOptions,
				);
				expect(mockStorage.setCredentialData).toHaveBeenCalledWith(
					credentialId,
					'U22222',
					handle.resolverId,
					'encrypted',
					validOptions,
				);
			});
		});
	});

	describe('parseOptions error path', () => {
		it('should throw CredentialResolverValidationError when getSecret receives invalid options', async () => {
			const resolver = new SlackCredentialResolver(
				mockLogger,
				mockIdentifier,
				mockStorage,
				mockCipher,
			);
			const context = testHelpers.createContext('U12345');
			const handle = testHelpers.createHandle({ signingSecret: '' }); // invalid: empty

			await expect(resolver.getSecret('cred-123', context, handle)).rejects.toThrow();
			expect(mockLogger.error).toHaveBeenCalledWith(
				expect.stringContaining('Invalid options'),
				expect.any(Object),
			);
		});
	});

	describe('metadata', () => {
		it('should have correct resolver metadata', () => {
			const resolver = new SlackCredentialResolver(
				mockLogger,
				mockIdentifier,
				mockStorage,
				mockCipher,
			);

			expect(resolver.metadata.name).toBe('credential-resolver.slack-1.0');
			expect(resolver.metadata.displayName).toBe('Slack Resolver');
			expect(resolver.metadata.options).toHaveLength(2);
			expect(resolver.metadata.options[0].name).toBe('signingSecret');
			expect(resolver.metadata.options[1].name).toBe('subjectClaim');
		});
	});
});
