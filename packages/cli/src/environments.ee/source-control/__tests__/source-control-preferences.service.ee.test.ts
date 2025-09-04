import { mock } from 'jest-mock-extended';
import type { InstanceSettings, Cipher } from 'n8n-core';
import { readFile, access, mkdir } from 'fs/promises';
import os from 'os';
import path from 'path';
import type { Logger } from '@n8n/backend-common';
import type { SettingsRepository } from '@n8n/db';

import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import { SourceControlPreferences } from '../types/source-control-preferences';

// Restore real fs modules for these tests since we need actual file operations
jest.unmock('node:fs');
jest.unmock('node:fs/promises');

describe('SourceControlPreferencesService', () => {
	const instanceSettings = mock<InstanceSettings>({ n8nFolder: '' });
	const service = new SourceControlPreferencesService(
		instanceSettings,
		mock(),
		mock(),
		mock(),
		mock(),
	);

	it('should validate SSH preferences with git@ URLs', async () => {
		const validPreferences: Partial<SourceControlPreferences> = {
			branchName: 'main',
			repositoryUrl: 'git@github.com:n8ntest/n8n_testrepo.git',
			branchReadOnly: false,
			branchColor: '#5296D6',
		};
		const validationResult = await service.validateSourceControlPreferences(validPreferences);
		expect(validationResult).toBeTruthy();
	});

	it('should validate HTTPS preferences with username and token', async () => {
		const validHttpsPreferences: Partial<SourceControlPreferences> = {
			branchName: 'main',
			repositoryUrl: 'https://github.com/n8ntest/n8n_testrepo.git',
			branchReadOnly: false,
			branchColor: '#5296D6',
			protocol: 'https',
			username: 'testuser',
			personalAccessToken: 'token123',
		};
		const validationResult = await service.validateSourceControlPreferences(validHttpsPreferences);
		expect(validationResult).toBeTruthy();
	});

	it('should validate SSH preferences (backward compatibility)', async () => {
		const validSshPreferences: Partial<SourceControlPreferences> = {
			branchName: 'main',
			repositoryUrl: 'git@github.com:n8ntest/n8n_testrepo.git',
			branchReadOnly: false,
			branchColor: '#5296D6',
			protocol: 'ssh',
		};
		const validationResult = await service.validateSourceControlPreferences(validSshPreferences);
		expect(validationResult).toBeTruthy();
	});

	it('should fail validation with invalid protocol', async () => {
		const invalidPreferences: any = {
			branchName: 'main',
			repositoryUrl: 'https://github.com/n8ntest/n8n_testrepo.git',
			branchReadOnly: false,
			branchColor: '#5296D6',
			protocol: 'ftp', // invalid protocol
		};
		await expect(service.validateSourceControlPreferences(invalidPreferences)).rejects.toThrow();
	});

	it('should fail validation for HTTPS protocol with missing username', async () => {
		const invalidHttpsPreferences: Partial<SourceControlPreferences> = {
			branchName: 'main',
			repositoryUrl: 'https://github.com/n8ntest/n8n_testrepo.git',
			branchReadOnly: false,
			branchColor: '#5296D6',
			protocol: 'https',
			// Missing username
			personalAccessToken: 'token123',
		};
		await expect(
			service.validateSourceControlPreferences(invalidHttpsPreferences),
		).rejects.toThrow();
	});

	it('should fail validation for HTTPS protocol with missing token', async () => {
		const invalidHttpsPreferences: Partial<SourceControlPreferences> = {
			branchName: 'main',
			repositoryUrl: 'https://github.com/n8ntest/n8n_testrepo.git',
			branchReadOnly: false,
			branchColor: '#5296D6',
			protocol: 'https',
			username: 'testuser',
			// Missing personalAccessToken
		};
		await expect(
			service.validateSourceControlPreferences(invalidHttpsPreferences),
		).rejects.toThrow();
	});

	it('should fail validation for HTTPS protocol with both missing credentials', async () => {
		const invalidHttpsPreferences: Partial<SourceControlPreferences> = {
			branchName: 'main',
			repositoryUrl: 'https://github.com/n8ntest/n8n_testrepo.git',
			branchReadOnly: false,
			branchColor: '#5296D6',
			protocol: 'https',
			// Missing both username and personalAccessToken
		};
		await expect(
			service.validateSourceControlPreferences(invalidHttpsPreferences),
		).rejects.toThrow();
	});

	it('should merge preferences with default protocol as SSH for backward compatibility', () => {
		const userPreferences = {
			branchName: 'feature',
			repositoryUrl: 'git@github.com:user/repo.git',
		};
		const defaultPreferences = {
			branchName: 'main',
			branchReadOnly: false,
			branchColor: '#5296D6',
		};

		const merged = SourceControlPreferences.merge(userPreferences, defaultPreferences);

		expect(merged.branchName).toBe('feature');
		expect(merged.protocol).toBe('ssh'); // Should default to ssh
		expect(merged.username).toBeUndefined();
		expect(merged.personalAccessToken).toBeUndefined();
	});

	it('should merge HTTPS preferences correctly', () => {
		const userPreferences = {
			branchName: 'feature',
			repositoryUrl: 'https://github.com/user/repo.git',
			protocol: 'https' as const,
			username: 'testuser',
			personalAccessToken: 'token123',
		};
		const defaultPreferences = {
			branchName: 'main',
			branchReadOnly: false,
			branchColor: '#5296D6',
		};

		const merged = SourceControlPreferences.merge(userPreferences, defaultPreferences);

		expect(merged.branchName).toBe('feature');
		expect(merged.protocol).toBe('https');
		expect(merged.username).toBe('testuser');
		expect(merged.personalAccessToken).toBe('token123');
	});

	it('should clear HTTPS credentials when switching from HTTPS to SSH protocol', () => {
		const userPreferences = {
			protocol: 'ssh' as const, // Explicitly switching to SSH
		};
		const defaultPreferences = {
			branchName: 'main',
			branchReadOnly: false,
			branchColor: '#5296D6',
			protocol: 'https' as const,
			username: 'testuser',
			personalAccessToken: 'token123',
		};

		const merged = SourceControlPreferences.merge(userPreferences, defaultPreferences);

		expect(merged.protocol).toBe('ssh');
		expect(merged.username).toBeUndefined();
		expect(merged.personalAccessToken).toBeUndefined();
	});

	it('should preserve HTTPS credentials when not switching protocols', () => {
		const userPreferences = {
			branchName: 'feature',
		};
		const defaultPreferences = {
			branchName: 'main',
			branchReadOnly: false,
			branchColor: '#5296D6',
			protocol: 'https' as const,
			username: 'testuser',
			personalAccessToken: 'token123',
		};

		const merged = SourceControlPreferences.merge(userPreferences, defaultPreferences);

		expect(merged.protocol).toBe('https');
		expect(merged.username).toBe('testuser');
		expect(merged.personalAccessToken).toBe('token123');
	});

	it('should handle switching from SSH to HTTPS protocol with new credentials', () => {
		const userPreferences = {
			protocol: 'https' as const,
			username: 'newuser',
			personalAccessToken: 'newtoken123',
		};
		const defaultPreferences = {
			branchName: 'main',
			branchReadOnly: false,
			branchColor: '#5296D6',
			protocol: 'ssh' as const,
		};

		const merged = SourceControlPreferences.merge(userPreferences, defaultPreferences);

		expect(merged.protocol).toBe('https');
		expect(merged.username).toBe('newuser');
		expect(merged.personalAccessToken).toBe('newtoken123');
	});

	describe('line ending normalization', () => {
		let tempDir: string;

		beforeEach(async () => {
			tempDir = path.join(os.tmpdir(), 'n8n-test-' + Date.now());
			await mkdir(tempDir, { recursive: true });
		});

		it('should normalize CRLF line endings to LF when writing private key', async () => {
			// Arrange
			const keyWithCRLF =
				'-----BEGIN OPENSSH PRIVATE KEY-----\r\ntest\r\nkey\r\ndata\r\n-----END OPENSSH PRIVATE KEY-----\r\n';
			const expectedNormalizedKey = keyWithCRLF.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

			const mockCipher = mock<Cipher>();
			mockCipher.decrypt.mockReturnValue(keyWithCRLF);

			const instanceSettings = mock<InstanceSettings>({ n8nFolder: tempDir });
			const service = new SourceControlPreferencesService(
				instanceSettings,
				mock(),
				mockCipher,
				mock(),
				mock(),
			);

			// Mock the getKeyPairFromDatabase method to return a key pair
			jest.spyOn(service as any, 'getKeyPairFromDatabase').mockResolvedValue({
				encryptedPrivateKey: 'encrypted',
				publicKey: 'public',
			});

			// Act
			const tempFilePath = await service.getPrivateKeyPath();

			// Assert - check the actual file content has normalized line endings
			const fileContent = await readFile(tempFilePath, 'utf8');
			expect(fileContent).not.toContain('\r');
			expect(fileContent).toBe(expectedNormalizedKey);
		});

		it('should normalize mixed CR and CRLF line endings to LF when writing private key', async () => {
			// Arrange
			const keyWithMixedEndings =
				'-----BEGIN OPENSSH PRIVATE KEY-----\r\ntest\rkey\r\ndata\r-----END OPENSSH PRIVATE KEY-----\n';

			const mockCipher = mock<Cipher>();
			mockCipher.decrypt.mockReturnValue(keyWithMixedEndings);

			const instanceSettings = mock<InstanceSettings>({ n8nFolder: tempDir });
			const service = new SourceControlPreferencesService(
				instanceSettings,
				mock(),
				mockCipher,
				mock(),
				mock(),
			);

			// Mock the getKeyPairFromDatabase method
			jest.spyOn(service as any, 'getKeyPairFromDatabase').mockResolvedValue({
				encryptedPrivateKey: 'encrypted',
				publicKey: 'public',
			});

			// Act
			const tempFilePath = await service.getPrivateKeyPath();

			// Assert - check the actual file content has normalized line endings
			const fileContent = await readFile(tempFilePath, 'utf8');
			expect(fileContent).not.toContain('\r');
			expect(fileContent).toBe(
				'-----BEGIN OPENSSH PRIVATE KEY-----\ntest\nkey\ndata\n-----END OPENSSH PRIVATE KEY-----\n',
			);
		});

		it('should leave existing LF line endings unchanged when writing private key', async () => {
			// Arrange
			const keyWithLF =
				'-----BEGIN OPENSSH PRIVATE KEY-----\ntest\nkey\ndata\n-----END OPENSSH PRIVATE KEY-----\n';

			const mockCipher = mock<Cipher>();
			mockCipher.decrypt.mockReturnValue(keyWithLF);

			const instanceSettings = mock<InstanceSettings>({ n8nFolder: tempDir });
			const service = new SourceControlPreferencesService(
				instanceSettings,
				mock(),
				mockCipher,
				mock(),
				mock(),
			);

			// Mock the getKeyPairFromDatabase method
			jest.spyOn(service as any, 'getKeyPairFromDatabase').mockResolvedValue({
				encryptedPrivateKey: 'encrypted',
				publicKey: 'public',
			});

			// Act
			const tempFilePath = await service.getPrivateKeyPath();

			// Assert - check the actual file content remains unchanged
			const fileContent = await readFile(tempFilePath, 'utf8');
			expect(fileContent).toBe(keyWithLF);
		});
	});

	describe('file security and permissions', () => {
		let tempDir: string;

		beforeEach(async () => {
			tempDir = path.join(os.tmpdir(), 'n8n-test-' + Date.now());
			await mkdir(tempDir, { recursive: true });
		});

		it('should always use restrictive permissions for SSH private keys', async () => {
			// Arrange
			const testKey =
				'-----BEGIN OPENSSH PRIVATE KEY-----\ntest-key-content\n-----END OPENSSH PRIVATE KEY-----\n';

			const mockCipher = mock<Cipher>();
			mockCipher.decrypt.mockReturnValue(testKey);

			const instanceSettings = mock<InstanceSettings>({ n8nFolder: tempDir });
			const service = new SourceControlPreferencesService(
				instanceSettings,
				mock(),
				mockCipher,
				mock(),
				mock(),
			);

			// Mock the getKeyPairFromDatabase method
			jest.spyOn(service as any, 'getKeyPairFromDatabase').mockResolvedValue({
				encryptedPrivateKey: 'encrypted',
				publicKey: 'public',
			});

			// Act
			const tempFilePath = await service.getPrivateKeyPath();

			// Assert - check the actual file permissions
			const fs = require('fs');
			const stats = await fs.promises.stat(tempFilePath);
			const permissions = (stats.mode & parseInt('777', 8)).toString(8);

			expect(permissions).toBe('600'); // Owner read/write only
			expect(stats.mode & 0o077).toBe(0); // Group and others have no permissions
		});

		it('should fail securely when file cannot be created', async () => {
			// Arrange
			const instanceSettings = mock<InstanceSettings>({ n8nFolder: '/nonexistent/path' });
			const service = new SourceControlPreferencesService(
				instanceSettings,
				mock(),
				mock(),
				mock(),
				mock(),
			);

			const testKey =
				'-----BEGIN OPENSSH PRIVATE KEY-----\ntest-key-content\n-----END OPENSSH PRIVATE KEY-----\n';
			jest.spyOn(service as any, 'getPrivateKeyFromDatabase').mockResolvedValue(testKey);

			// Act & Assert - should throw OperationalError when file creation fails
			await expect(service.getPrivateKeyPath()).rejects.toThrow(
				'Failed to create SSH private key file',
			);
		});

		it('should remove existing file before creating new one with fsRm force option', async () => {
			// Arrange
			const testKey =
				'-----BEGIN OPENSSH PRIVATE KEY-----\ntest-key-content\n-----END OPENSSH PRIVATE KEY-----\n';

			const mockCipher = mock<Cipher>();
			mockCipher.decrypt.mockReturnValue(testKey);

			const instanceSettings = mock<InstanceSettings>({ n8nFolder: tempDir });
			const service = new SourceControlPreferencesService(
				instanceSettings,
				mock(),
				mockCipher,
				mock(),
				mock(),
			);

			// Mock the getKeyPairFromDatabase method
			jest.spyOn(service as any, 'getKeyPairFromDatabase').mockResolvedValue({
				encryptedPrivateKey: 'encrypted',
				publicKey: 'public',
			});

			// Create a test file first
			const tempFilePath1 = await service.getPrivateKeyPath();
			expect(await access(tempFilePath1)).toBeUndefined(); // File exists

			// Act - call again to test file removal and recreation
			const tempFilePath2 = await service.getPrivateKeyPath();

			// Assert - should succeed without errors (fsRm with force: true handles existing file)
			expect(tempFilePath2).toBe(tempFilePath1);
			const fileContent = await readFile(tempFilePath2, 'utf8');
			expect(fileContent).toBe(testKey);
		});
	});

	describe('Personal Access Token Encryption', () => {
		let service: SourceControlPreferencesService;
		let mockCipher: jest.Mocked<Cipher>;
		let mockSettingsRepository: jest.Mocked<SettingsRepository>;
		let mockLogger: jest.Mocked<Logger>;
		let mockInstanceSettings: InstanceSettings;

		beforeEach(() => {
			mockCipher = mock<Cipher>();
			mockSettingsRepository = mock<SettingsRepository>();
			mockLogger = mock<Logger>();
			mockInstanceSettings = mock<InstanceSettings>({ n8nFolder: '/test' });

			service = new SourceControlPreferencesService(
				mockInstanceSettings,
				mockLogger,
				mockCipher,
				mockSettingsRepository,
				mock(),
			);
		});

		describe('encryptPersonalAccessToken', () => {
			it('should encrypt personal access token', () => {
				const plainToken = 'ghp_abcd1234567890';
				const encryptedToken = 'encrypted:token:value';
				mockCipher.encrypt.mockReturnValue(encryptedToken);

				const result = (service as any).encryptPersonalAccessToken(plainToken);

				expect(mockCipher.encrypt).toHaveBeenCalledWith(plainToken);
				expect(result).toBe(encryptedToken);
			});
		});

		describe('decryptPersonalAccessToken', () => {
			it('should decrypt personal access token', () => {
				const encryptedToken = 'encrypted:token:value';
				const plainToken = 'ghp_abcd1234567890';
				mockCipher.decrypt.mockReturnValue(plainToken);

				const result = (service as any).decryptPersonalAccessToken(encryptedToken);

				expect(mockCipher.decrypt).toHaveBeenCalledWith(encryptedToken);
				expect(result).toBe(plainToken);
			});
		});

		describe('preparePreferencesForStorage', () => {
			it('should encrypt personal access token for storage', () => {
				const plainToken = 'ghp_abcd1234567890';
				const encryptedToken = 'encrypted:token:value';
				mockCipher.encrypt.mockReturnValue(encryptedToken);

				const preferences = {
					protocol: 'https' as const,
					username: 'testuser',
					personalAccessToken: plainToken,
					branchName: 'main',
				};

				const result = (service as any).preparePreferencesForStorage(preferences);

				expect(result.personalAccessToken).toBe(encryptedToken);
				expect(result.username).toBe('testuser');
				expect(result.branchName).toBe('main');
				expect(mockCipher.encrypt).toHaveBeenCalledWith(plainToken);
			});

			it('should leave other fields unchanged when encrypting', () => {
				const preferences = {
					protocol: 'https' as const,
					username: 'testuser',
					personalAccessToken: 'token123',
					branchName: 'feature-branch',
					branchReadOnly: true,
					branchColor: '#ff5733',
				};
				mockCipher.encrypt.mockReturnValue('encrypted:token123');

				const result = (service as any).preparePreferencesForStorage(preferences);

				expect(result.protocol).toBe('https');
				expect(result.username).toBe('testuser');
				expect(result.branchName).toBe('feature-branch');
				expect(result.branchReadOnly).toBe(true);
				expect(result.branchColor).toBe('#ff5733');
				expect(result.personalAccessToken).toBe('encrypted:token123');
			});

			it('should handle preferences without personal access token', () => {
				const preferences = {
					protocol: 'ssh' as const,
					branchName: 'main',
				};

				const result = (service as any).preparePreferencesForStorage(preferences);

				expect(result).toEqual(preferences);
				expect(mockCipher.encrypt).not.toHaveBeenCalled();
			});
		});

		describe('preparePreferencesFromStorage', () => {
			it('should decrypt encrypted personal access token', () => {
				// Create a valid encrypted token with cipher envelope format
				const encryptedToken = Buffer.concat([
					Buffer.from('53616c7465645f5f', 'hex'), // 'Salted__'
					Buffer.from('salt1234'),
					Buffer.from('encrypted_content_here'),
				]).toString('base64');

				const plainToken = 'ghp_abcd1234567890';
				mockCipher.decrypt.mockReturnValue(plainToken);

				const preferences = {
					protocol: 'https' as const,
					username: 'testuser',
					personalAccessToken: encryptedToken,
				};

				const result = (service as any).preparePreferencesFromStorage(preferences);

				expect(result.personalAccessToken).toBe(plainToken);
				expect(mockCipher.decrypt).toHaveBeenCalledWith(encryptedToken);
			});

			it('should handle plain text token for backward compatibility', () => {
				const plainToken = 'plain_text_token';
				mockLogger.warn.mockImplementation();

				const preferences = {
					protocol: 'https' as const,
					username: 'testuser',
					personalAccessToken: plainToken,
				};

				const result = (service as any).preparePreferencesFromStorage(preferences);

				expect(result.personalAccessToken).toBe(plainToken);
				expect(mockCipher.decrypt).not.toHaveBeenCalled();
			});

			it('should detect encrypted token by cipher envelope format', () => {
				// Create a mock base64 string that looks like n8n cipher output
				// Starting with 'Salted__' prefix (53616c7465645f5f) + some content
				const mockEncryptedToken = Buffer.concat([
					Buffer.from('53616c7465645f5f', 'hex'), // 'Salted__'
					Buffer.from('salt1234'),
					Buffer.from('encrypted_content_here'),
				]).toString('base64');

				const plainToken = 'decrypted_token';
				mockCipher.decrypt.mockReturnValue(plainToken);

				const preferences = {
					personalAccessToken: mockEncryptedToken,
				};

				const result = (service as any).preparePreferencesFromStorage(preferences);

				expect(result.personalAccessToken).toBe(plainToken);
				expect(mockCipher.decrypt).toHaveBeenCalledWith(mockEncryptedToken);
			});

			it('should not attempt to decrypt plain text tokens', () => {
				const plainToken = 'plain_text_token_without_envelope';

				const preferences = {
					personalAccessToken: plainToken,
				};

				const result = (service as any).preparePreferencesFromStorage(preferences);

				expect(result.personalAccessToken).toBe(plainToken);
				expect(mockCipher.decrypt).not.toHaveBeenCalled();
			});

			it('should detect encrypted values using isEncryptedValue method', () => {
				// Valid encrypted token with proper envelope
				const validEncryptedToken = Buffer.concat([
					Buffer.from('53616c7465645f5f', 'hex'), // 'Salted__'
					Buffer.from('salt1234'),
					Buffer.from('encrypted_content_here'),
				]).toString('base64');

				expect((service as any).isEncryptedValue(validEncryptedToken)).toBe(true);
				expect((service as any).isEncryptedValue('plain_text')).toBe(false);
				expect((service as any).isEncryptedValue('short')).toBe(false);
				expect((service as any).isEncryptedValue('invalid_base64!')).toBe(false);
			});

			it('should handle decryption failure gracefully', () => {
				// Create a malformed token that looks like it should be encrypted but fails decryption
				const malformedEncryptedToken = Buffer.concat([
					Buffer.from('53616c7465645f5f', 'hex'), // 'Salted__'
					Buffer.from('malformed_salt'),
					Buffer.from('malformed_content'),
				]).toString('base64');

				mockCipher.decrypt.mockImplementation(() => {
					throw new Error('Decryption failed');
				});
				mockLogger.warn.mockImplementation();

				const preferences = {
					personalAccessToken: malformedEncryptedToken,
				};

				const result = (service as any).preparePreferencesFromStorage(preferences);

				expect(result.personalAccessToken).toBe(malformedEncryptedToken);
				expect(mockLogger.warn).toHaveBeenCalledWith(
					'Failed to decrypt personal access token, treating as plain text',
					expect.objectContaining({
						error: 'Decryption failed',
					}),
				);
			});

			it('should leave other fields unchanged during decryption', () => {
				const encryptedToken = Buffer.concat([
					Buffer.from('53616c7465645f5f', 'hex'), // 'Salted__'
					Buffer.from('salt1234'),
					Buffer.from('encrypted_data'),
				]).toString('base64');

				const preferences = {
					protocol: 'https' as const,
					username: 'testuser',
					personalAccessToken: encryptedToken,
					branchName: 'main',
					branchReadOnly: false,
				};
				mockCipher.decrypt.mockReturnValue('decrypted_token');

				const result = (service as any).preparePreferencesFromStorage(preferences);

				expect(result.protocol).toBe('https');
				expect(result.username).toBe('testuser');
				expect(result.branchName).toBe('main');
				expect(result.branchReadOnly).toBe(false);
				expect(result.personalAccessToken).toBe('decrypted_token');
			});

			it('should handle preferences without personal access token', () => {
				const preferences = {
					protocol: 'ssh' as const,
					branchName: 'main',
				};

				const result = (service as any).preparePreferencesFromStorage(preferences);

				expect(result).toEqual(preferences);
				expect(mockCipher.decrypt).not.toHaveBeenCalled();
			});
		});

		describe('getPreferencesForResponse', () => {
			it('should exclude personalAccessToken from response', () => {
				const preferences = new SourceControlPreferences({
					protocol: 'https',
					username: 'testuser',
					personalAccessToken: 'secret_token',
					branchName: 'main',
					branchReadOnly: false,
					connected: true,
				});

				// Set the internal preferences
				(service as any)._sourceControlPreferences = preferences;

				const result = service.getPreferencesForResponse();

				expect(result.username).toBe('testuser');
				expect(result.branchName).toBe('main');
				expect(result.protocol).toBe('https');
				expect(result.connected).toBe(true);
				expect('personalAccessToken' in result).toBe(false);
			});

			it('should return SSH preferences without sensitive fields', () => {
				const preferences = new SourceControlPreferences({
					protocol: 'ssh',
					branchName: 'develop',
					branchReadOnly: true,
					connected: true,
				});

				(service as any)._sourceControlPreferences = preferences;

				const result = service.getPreferencesForResponse();

				expect(result.protocol).toBe('ssh');
				expect(result.branchName).toBe('develop');
				expect(result.branchReadOnly).toBe(true);
				expect(result.connected).toBe(true);
				expect('personalAccessToken' in result).toBe(false);
			});
		});

		describe('setPreferences with encryption', () => {
			beforeEach(() => {
				// Mock key pair methods
				jest.spyOn(service as any, 'getKeyPairFromDatabase').mockResolvedValue({
					encryptedPrivateKey: 'encrypted_key',
					publicKey: 'public_key',
				});
				mockSettingsRepository.save.mockResolvedValue({} as any);
			});

			it('should encrypt personal access token before saving to database', async () => {
				const plainToken = 'ghp_test123';
				const encryptedToken = 'encrypted:ghp_test123';
				mockCipher.encrypt.mockReturnValue(encryptedToken);

				const preferences = {
					protocol: 'https' as const,
					username: 'testuser',
					personalAccessToken: plainToken,
					branchName: 'main',
				};

				await service.setPreferences(preferences, true);

				expect(mockCipher.encrypt).toHaveBeenCalledWith(plainToken);
				expect(mockSettingsRepository.save).toHaveBeenCalledWith(
					expect.objectContaining({
						value: expect.stringContaining(encryptedToken),
					}),
					{ transaction: false },
				);
			});

			it('should store preferences without encryption when saveToDb is false', async () => {
				const preferences = {
					protocol: 'https' as const,
					username: 'testuser',
					personalAccessToken: 'plain_token',
					branchName: 'main',
				};

				const result = await service.setPreferences(preferences, false);

				expect(result.personalAccessToken).toBe('plain_token');
				expect(mockCipher.encrypt).not.toHaveBeenCalled();
				expect(mockSettingsRepository.save).not.toHaveBeenCalled();
			});

			it('should keep decrypted token in memory for runtime use', async () => {
				const plainToken = 'runtime_token';
				const encryptedToken = 'encrypted:runtime_token';
				mockCipher.encrypt.mockReturnValue(encryptedToken);

				const preferences = {
					protocol: 'https' as const,
					username: 'testuser',
					personalAccessToken: plainToken,
				};

				const result = await service.setPreferences(preferences, true);

				// Runtime preferences should have plain token
				expect(result.personalAccessToken).toBe(plainToken);
				// But database should get encrypted version
				expect(mockSettingsRepository.save).toHaveBeenCalledWith(
					expect.objectContaining({
						value: expect.stringContaining(encryptedToken),
					}),
					{ transaction: false },
				);
			});
		});

		describe('loadFromDbAndApplySourceControlPreferences with decryption', () => {
			beforeEach(() => {
				// Mock key pair generation to avoid SSH key generation issues
				jest.spyOn(service as any, 'getKeyPairFromDatabase').mockResolvedValue({
					encryptedPrivateKey: 'mock-encrypted-key',
					publicKey: 'mock-public-key',
				});
				jest.spyOn(service, 'generateAndSaveKeyPair').mockResolvedValue({} as any);
			});

			it('should decrypt personal access token when loading from database', async () => {
				const encryptedToken = Buffer.concat([
					Buffer.from('53616c7465645f5f', 'hex'), // 'Salted__'
					Buffer.from('salt5678'),
					Buffer.from('db_encrypted_token'),
				]).toString('base64');

				const plainToken = 'decrypted_db_token';
				mockCipher.decrypt.mockReturnValue(plainToken);

				const storedPreferences = {
					protocol: 'https',
					username: 'dbuser',
					personalAccessToken: encryptedToken,
					branchName: 'db-branch',
				};

				mockSettingsRepository.findOne.mockResolvedValue({
					value: JSON.stringify(storedPreferences),
				} as any);

				const result = await service.loadFromDbAndApplySourceControlPreferences();

				expect(result?.personalAccessToken).toBe(plainToken);
				expect(result?.username).toBe('dbuser');
				expect(mockCipher.decrypt).toHaveBeenCalledWith(encryptedToken);
			});

			it('should handle missing database preferences', async () => {
				mockSettingsRepository.findOne.mockResolvedValue(null);
				mockSettingsRepository.save.mockResolvedValue({} as any);

				const result = await service.loadFromDbAndApplySourceControlPreferences();

				expect(result).toBeDefined();
				expect(mockCipher.decrypt).not.toHaveBeenCalled();
			});

			it('should handle corrupted database preferences gracefully', async () => {
				mockSettingsRepository.findOne.mockResolvedValue({
					value: 'invalid-json',
				} as any);
				mockSettingsRepository.save.mockResolvedValue({} as any);
				mockLogger.warn.mockImplementation();

				const result = await service.loadFromDbAndApplySourceControlPreferences();

				expect(result).toBeDefined();
				expect(mockLogger.warn).toHaveBeenCalledWith(
					expect.stringContaining('Could not parse Source Control settings from database'),
				);
			});
		});
	});
});
