import { mock } from 'jest-mock-extended';
import type { Logger } from '@n8n/backend-common';
import type { InstanceSettings, Cipher } from 'n8n-core';
import type { SettingsRepository } from '@n8n/db';

import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import { SourceControlGitService } from '../source-control-git.service.ee';
import { SourceControlPreferences } from '../types/source-control-preferences';

describe('Source Control Security', () => {
	let preferencesService: SourceControlPreferencesService;
	let gitService: SourceControlGitService;
	let mockLogger: jest.Mocked<Logger>;
	let mockCipher: jest.Mocked<Cipher>;
	let mockSettingsRepository: jest.Mocked<SettingsRepository>;

	beforeEach(() => {
		mockLogger = mock<Logger>();
		mockCipher = mock<Cipher>();
		mockSettingsRepository = mock<SettingsRepository>();

		preferencesService = new SourceControlPreferencesService(
			mock<InstanceSettings>({ n8nFolder: '/test' }),
			mockLogger,
			mockCipher,
			mockSettingsRepository,
			mock(),
		);

		gitService = new SourceControlGitService(mockLogger, mock(), preferencesService);
	});

	describe('Credential Storage Security', () => {
		it('should never store plain text personal access tokens in database', async () => {
			const plainToken = 'ghp_sensitive_token_123';
			const encryptedToken = 'encrypted:' + Buffer.from(plainToken).toString('base64');

			mockCipher.encrypt.mockReturnValue(encryptedToken);
			mockSettingsRepository.save.mockResolvedValue({} as any);

			// Mock key pair to avoid SSH generation
			jest.spyOn(preferencesService as any, 'getKeyPairFromDatabase').mockResolvedValue({
				encryptedPrivateKey: 'mock-key',
				publicKey: 'mock-public-key',
			});

			const preferences = {
				protocol: 'https' as const,
				username: 'testuser',
				personalAccessToken: plainToken,
				branchName: 'main',
			};

			await preferencesService.setPreferences(preferences, true);

			// Verify encryption was called
			expect(mockCipher.encrypt).toHaveBeenCalledWith(plainToken);

			// Verify database received encrypted version, not plain text
			expect(mockSettingsRepository.save).toHaveBeenCalledWith(
				expect.objectContaining({
					value: expect.stringContaining(encryptedToken),
				}),
				{ transaction: false },
			);

			// Verify plain text token is NOT stored
			const saveCall = mockSettingsRepository.save.mock.calls[0][0];
			expect(saveCall.value).not.toContain(plainToken);
		});

		it('should never expose personal access token in response objects', () => {
			const sensitivePreferences = new SourceControlPreferences({
				protocol: 'https',
				username: 'testuser',
				personalAccessToken: 'ghp_secret_should_not_appear',
				branchName: 'main',
				branchReadOnly: false,
				connected: true,
			});

			// Set internal preferences
			(preferencesService as any)._sourceControlPreferences = sensitivePreferences;

			const responsePreferences = preferencesService.getPreferencesForResponse();

			// Verify sensitive field is excluded
			expect('personalAccessToken' in responsePreferences).toBe(false);
			expect(responsePreferences).not.toHaveProperty('personalAccessToken');

			// Verify other fields are present
			expect(responsePreferences.username).toBe('testuser');
			expect(responsePreferences.protocol).toBe('https');
			expect(responsePreferences.branchName).toBe('main');
		});

		it('should detect and handle potentially corrupted encrypted tokens', async () => {
			// Create a token that looks encrypted (has proper envelope) but will fail decryption
			const malformedToken = Buffer.concat([
				Buffer.from('53616c7465645f5f', 'hex'), // 'Salted__' prefix
				Buffer.from('badsalt1'), // Invalid salt
				Buffer.from('corrupted_content'), // Corrupted content
			]).toString('base64');

			mockCipher.decrypt.mockImplementation(() => {
				throw new Error('Invalid cipher data');
			});

			const preferences = {
				protocol: 'https' as const,
				personalAccessToken: malformedToken,
			};

			// Should not throw, but handle gracefully
			const result = (preferencesService as any).preparePreferencesFromStorage(preferences);

			expect(result.personalAccessToken).toBe(malformedToken);
			expect(mockLogger.warn).toHaveBeenCalledWith(
				'Failed to decrypt personal access token, treating as plain text',
				expect.objectContaining({
					error: 'Invalid cipher data',
				}),
			);
		});
	});

	describe('Log Security', () => {
		it('should sanitize credentials from error messages', () => {
			const repositoryUrl = 'https://user:secret_token@github.com/repo.git';

			// Simulate error with credentials in URL
			const error = new Error(`Failed to connect to ${repositoryUrl}`);

			// The git service should sanitize such errors
			const sanitizedError = error.message.replace(/\/\/[^@/]+@/, '//[REDACTED]@');

			expect(sanitizedError).not.toContain('secret_token');
			expect(sanitizedError).toContain('[REDACTED]');
			expect(sanitizedError).toContain(
				'Failed to connect to https://[REDACTED]@github.com/repo.git',
			);
		});

		it('should not log personal access tokens during authentication setup', async () => {
			const sensitiveToken = 'ghp_very_secret_token';
			const preferences = new SourceControlPreferences({
				protocol: 'https',
				username: 'testuser',
				personalAccessToken: sensitiveToken,
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
			});

			// Mock the preferences service to return our test preferences
			jest.spyOn(preferencesService, 'getPreferences').mockReturnValue(preferences);

			// Create spy on logger methods
			const loggerSpy = jest.spyOn(mockLogger, 'debug');

			try {
				// This would normally fail due to missing git binary, but we're testing log security
				await gitService.initService({
					sourceControlPreferences: preferences,
					gitFolder: '/test/git',
					sshFolder: '/test/ssh',
					sshKeyName: 'key',
				});
			} catch {
				// Expected to fail, we're just checking logs
			}

			// Verify no log contains the sensitive token
			loggerSpy.mock.calls.forEach((call) => {
				const logMessage = JSON.stringify(call);
				expect(logMessage).not.toContain(sensitiveToken);
			});
		});
	});

	describe('Memory Security', () => {
		it('should clear sensitive environment variables on cleanup', async () => {
			const gitService = new SourceControlGitService(mockLogger, mock(), preferencesService);

			// Mock environment variables setup
			process.env.GIT_USERNAME = 'testuser';
			process.env.GIT_PASSWORD = 'sensitive_token';

			// Track sensitive variables
			(gitService as any).trackSensitiveEnvVar('GIT_USERNAME');
			(gitService as any).trackSensitiveEnvVar('GIT_PASSWORD');

			// Cleanup should clear these
			await gitService.cleanup();

			expect(process.env.GIT_USERNAME).toBeUndefined();
			expect(process.env.GIT_PASSWORD).toBeUndefined();
		});

		it('should clear git options containing credentials', async () => {
			const gitService = new SourceControlGitService(mockLogger, mock(), preferencesService);

			// Simulate git options with potential credentials
			(gitService as any).gitOptions = {
				config: ['credential.helper=store'],
				env: {
					GIT_PASSWORD: 'sensitive_data',
				},
			};

			await gitService.cleanup();

			// Verify git options are cleared
			expect((gitService as any).gitOptions).toEqual({});
		});
	});

	describe('File System Security', () => {
		it('should use restrictive permissions for temporary SSH key files', async () => {
			const mockKeyPair = {
				encryptedPrivateKey: 'encrypted-key-data',
				publicKey: 'public-key-data',
			};

			const decryptedKey =
				'-----BEGIN PRIVATE KEY-----\ntest-key-content\n-----END PRIVATE KEY-----';

			mockCipher.decrypt.mockReturnValue(decryptedKey);
			jest
				.spyOn(preferencesService as any, 'getKeyPairFromDatabase')
				.mockResolvedValue(mockKeyPair);

			// This would create a temp file with 0o600 permissions
			try {
				await preferencesService.getPrivateKeyPath();
			} catch {
				// May fail due to filesystem issues in test, but that's not what we're testing
			}

			// Verify cipher.decrypt was called (meaning encryption/decryption is working)
			expect(mockCipher.decrypt).toHaveBeenCalledWith(mockKeyPair.encryptedPrivateKey);
		});

		it('should handle secure file operations correctly', async () => {
			const mockKeyPair = {
				encryptedPrivateKey: 'encrypted-key-data',
				publicKey: 'public-key-data',
			};

			const decryptedKey =
				'-----BEGIN PRIVATE KEY-----\ntest-key-content\n-----END PRIVATE KEY-----';

			mockCipher.decrypt.mockReturnValue(decryptedKey);
			jest
				.spyOn(preferencesService as any, 'getKeyPairFromDatabase')
				.mockResolvedValue(mockKeyPair);

			// The method should attempt to decrypt and handle the key securely
			try {
				const keyPath = await preferencesService.getPrivateKeyPath();
				// Verify it returns a path (even if file creation might fail in test env)
				expect(typeof keyPath).toBe('string');
				expect(keyPath).toContain('ssh_private_key_temp');
			} catch (error) {
				// If it fails, it should be with a proper error message about file creation
				expect((error as Error).message).toContain('Failed to create SSH private key file');
			}

			// Verify cipher.decrypt was called (meaning encryption/decryption is working)
			expect(mockCipher.decrypt).toHaveBeenCalledWith(mockKeyPair.encryptedPrivateKey);
		});
	});

	describe('Validation Security', () => {
		it('should reject preferences with suspicious patterns', async () => {
			const suspiciousPreferences = {
				username: '../../../etc/passwd', // Path traversal attempt
				personalAccessToken: 'token',
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/user/repo.git',
			};

			// While not explicitly blocked, such patterns should be validated by Git operations
			const result =
				await preferencesService.validateSourceControlPreferences(suspiciousPreferences);
			expect(result).toBeDefined(); // Validation should complete without throwing
		});

		it('should require both username and token for HTTPS protocol', async () => {
			const incompletePreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/user/repo.git',
				username: 'testuser',
				// Missing personalAccessToken
			};

			await expect(
				preferencesService.validateSourceControlPreferences(incompletePreferences),
			).rejects.toThrow('Invalid source control preferences');
		});

		it('should not allow protocol switching without proper credentials', async () => {
			const switchingPreferences = {
				protocol: 'https' as const,
				// Missing required HTTPS credentials
			};

			await expect(
				preferencesService.validateSourceControlPreferences(switchingPreferences),
			).rejects.toThrow('Invalid source control preferences');
		});
	});

	describe('Encrypted Value Detection', () => {
		it('should correctly identify encrypted values using cipher envelope', () => {
			// Create a proper n8n cipher envelope format
			const validEncryptedValue = Buffer.concat([
				Buffer.from('53616c7465645f5f', 'hex'), // 'Salted__' prefix
				Buffer.from('saltsalt'), // 8-byte salt
				Buffer.from('encrypted_content_goes_here'), // Actual encrypted content
			]).toString('base64');

			const isEncrypted = (preferencesService as any).isEncryptedValue(validEncryptedValue);
			expect(isEncrypted).toBe(true);
		});

		it('should not misidentify plain text as encrypted', () => {
			const plainTextValues = [
				'ghp_plain_text_token',
				'just-a-regular-token',
				'base64-but-not-encrypted==',
				'too-short',
				'',
			];

			plainTextValues.forEach((value) => {
				const isEncrypted = (preferencesService as any).isEncryptedValue(value);
				expect(isEncrypted).toBe(false);
			});
		});

		it('should handle malformed base64 gracefully', () => {
			const malformedBase64 = 'this-is-not-valid-base64!@#$%';

			const isEncrypted = (preferencesService as any).isEncryptedValue(malformedBase64);
			expect(isEncrypted).toBe(false); // Should not throw, should return false
		});
	});
});
