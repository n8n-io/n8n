import { mock } from 'jest-mock-extended';
import type { InstanceSettings, Cipher } from 'n8n-core';
import type { SettingsRepository } from '@n8n/db';

import { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import type { SourceControlPreferences } from '../types/source-control-preferences';

describe('SourceControlPreferencesService - HTTPS functionality', () => {
	let sourceControlPreferencesService: SourceControlPreferencesService;
	let mockInstanceSettings: InstanceSettings;
	let mockCipher: Cipher;
	let mockSettingsRepository: SettingsRepository;

	beforeEach(() => {
		mockInstanceSettings = mock<InstanceSettings>({ n8nFolder: '/test' });
		mockCipher = {
			encrypt: jest.fn(),
			decrypt: jest.fn(),
		} as unknown as Cipher;
		mockSettingsRepository = mock<SettingsRepository>();

		sourceControlPreferencesService = new SourceControlPreferencesService(
			mockInstanceSettings,
			mock(),
			mockCipher,
			mockSettingsRepository,
			mock(),
		);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	describe('saveHttpsCredentials', () => {
		it('should encrypt and save HTTPS credentials', async () => {
			// Arrange
			const username = 'testuser';
			const password = 'testtoken';
			const encryptedUsername = 'encrypted_user';
			const encryptedPassword = 'encrypted_pass';

			(mockCipher.encrypt as jest.Mock)
				.mockReturnValueOnce(encryptedUsername)
				.mockReturnValueOnce(encryptedPassword);

			// Act
			await sourceControlPreferencesService.saveHttpsCredentials(username, password);

			// Assert
			expect(mockCipher.encrypt).toHaveBeenCalledWith(username);
			expect(mockCipher.encrypt).toHaveBeenCalledWith(password);
			expect(mockSettingsRepository.save).toHaveBeenCalledWith({
				key: 'features.sourceControl.httpsCredentials',
				value: JSON.stringify({
					encryptedUsername,
					encryptedPassword,
				}),
				loadOnStartup: true,
			});
		});

		it('should handle encryption errors gracefully', async () => {
			// Arrange
			const username = 'testuser';
			const password = 'testtoken';

			jest.spyOn(mockCipher, 'encrypt').mockImplementation(() => {
				throw new Error('Encryption failed');
			});

			// Act & Assert
			await expect(
				sourceControlPreferencesService.saveHttpsCredentials(username, password),
			).rejects.toThrow('Failed to save HTTPS credentials to database');
		});
	});

	describe('getDecryptedHttpsCredentials', () => {
		it('should decrypt and return HTTPS credentials', async () => {
			// Arrange
			const encryptedCredentials = {
				encryptedUsername: 'encrypted_user',
				encryptedPassword: 'encrypted_pass',
			};
			const decryptedUsername = 'testuser';
			const decryptedPassword = 'testtoken';

			jest.spyOn(mockSettingsRepository, 'findByKey').mockResolvedValue({
				key: 'features.sourceControl.httpsCredentials',
				value: JSON.stringify(encryptedCredentials),
			} as any);

			jest
				.spyOn(mockCipher, 'decrypt')
				.mockReturnValueOnce(decryptedUsername)
				.mockReturnValueOnce(decryptedPassword);

			// Act
			const result = await sourceControlPreferencesService.getDecryptedHttpsCredentials();

			// Assert
			expect(result).toEqual({
				username: decryptedUsername,
				password: decryptedPassword,
			});
			expect(mockCipher.decrypt).toHaveBeenCalledWith(encryptedCredentials.encryptedUsername);
			expect(mockCipher.decrypt).toHaveBeenCalledWith(encryptedCredentials.encryptedPassword);
		});

		it('should return null when no credentials are stored', async () => {
			// Arrange
			jest.spyOn(mockSettingsRepository, 'findByKey').mockResolvedValue(null);

			// Act
			const result = await sourceControlPreferencesService.getDecryptedHttpsCredentials();

			// Assert
			expect(result).toBeNull();
		});

		it('should return null when stored value is invalid JSON', async () => {
			// Arrange
			jest.spyOn(mockSettingsRepository, 'findByKey').mockResolvedValue({
				key: 'features.sourceControl.httpsCredentials',
				value: 'invalid-json',
			} as any);

			// Act
			const result = await sourceControlPreferencesService.getDecryptedHttpsCredentials();

			// Assert
			expect(result).toBeNull();
		});

		it('should return null when stored value is null', async () => {
			// Arrange
			jest.spyOn(mockSettingsRepository, 'findByKey').mockResolvedValue({
				key: 'features.sourceControl.httpsCredentials',
				value: null,
			} as any);

			// Act
			const result = await sourceControlPreferencesService.getDecryptedHttpsCredentials();

			// Assert
			expect(result).toBeNull();
		});
	});

	describe('deleteHttpsCredentials', () => {
		it('should delete HTTPS credentials from database', async () => {
			// Act
			await sourceControlPreferencesService.deleteHttpsCredentials();

			// Assert
			expect(mockSettingsRepository.delete).toHaveBeenCalledWith({
				key: 'features.sourceControl.httpsCredentials',
			});
		});

		it('should handle deletion errors gracefully without throwing', async () => {
			// Arrange
			jest.spyOn(mockSettingsRepository, 'delete').mockRejectedValue(new Error('Delete failed'));

			// Act & Assert - Should not throw
			await expect(
				sourceControlPreferencesService.deleteHttpsCredentials(),
			).resolves.toBeUndefined();
		});
	});

	describe('setPreferences', () => {
		it('should save HTTPS credentials and sanitize preferences for HTTPS connection', async () => {
			// Arrange
			const preferences: Partial<SourceControlPreferences> = {
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				connectionType: 'https',
				httpsUsername: 'testuser',
				httpsPassword: 'testtoken',
			};

			const saveSpy = jest
				.spyOn(sourceControlPreferencesService, 'saveHttpsCredentials')
				.mockResolvedValue(undefined);

			jest
				.spyOn(mockCipher, 'encrypt')
				.mockReturnValueOnce('encrypted_user')
				.mockReturnValueOnce('encrypted_pass');

			// Act
			const result = await sourceControlPreferencesService.setPreferences(preferences);

			// Assert
			expect(saveSpy).toHaveBeenCalledWith('testuser', 'testtoken');
			expect(result.httpsUsername).toBeUndefined();
			expect(result.httpsPassword).toBeUndefined();
			expect(result.connectionType).toBe('https');
		});

		it('should not generate SSH key pair for HTTPS connection', async () => {
			// Arrange
			const preferences: Partial<SourceControlPreferences> = {
				connectionType: 'https',
				httpsUsername: 'user',
				httpsPassword: 'token',
			};

			jest
				.spyOn(sourceControlPreferencesService as any, 'getKeyPairFromDatabase')
				.mockResolvedValue(null);

			const mockResult = { publicKey: 'mock-key' } as SourceControlPreferences;
			const generateSpy = jest
				.spyOn(sourceControlPreferencesService, 'generateAndSaveKeyPair')
				.mockResolvedValue(mockResult);

			jest
				.spyOn(sourceControlPreferencesService, 'saveHttpsCredentials')
				.mockResolvedValue(undefined);

			// Act
			await sourceControlPreferencesService.setPreferences(preferences);

			// Assert
			expect(generateSpy).not.toHaveBeenCalled();
		});

		it('should generate SSH key pair for SSH connection when no key pair exists', async () => {
			// Arrange
			const preferences: Partial<SourceControlPreferences> = {
				connectionType: 'ssh',
			};

			jest
				.spyOn(sourceControlPreferencesService as any, 'getKeyPairFromDatabase')
				.mockResolvedValue(null);

			const mockResult = { publicKey: 'mock-key' } as SourceControlPreferences;
			const generateSpy = jest
				.spyOn(sourceControlPreferencesService, 'generateAndSaveKeyPair')
				.mockResolvedValue(mockResult);

			// Act
			await sourceControlPreferencesService.setPreferences(preferences);

			// Assert
			expect(generateSpy).toHaveBeenCalled();
		});

		it('should generate SSH key pair for undefined connectionType when no key pair exists (backward compatibility)', async () => {
			// Arrange
			const preferences: Partial<SourceControlPreferences> = {
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				// connectionType is undefined for backward compatibility
			};

			jest
				.spyOn(sourceControlPreferencesService as any, 'getKeyPairFromDatabase')
				.mockResolvedValue(null);

			const mockResult = { publicKey: 'mock-key' } as SourceControlPreferences;
			const generateSpy = jest
				.spyOn(sourceControlPreferencesService, 'generateAndSaveKeyPair')
				.mockResolvedValue(mockResult);

			// Act
			await sourceControlPreferencesService.setPreferences(preferences);

			// Assert - Should generate SSH key for backward compatibility
			expect(generateSpy).toHaveBeenCalled();
		});

		it('should save HTTPS credentials and sanitize preferences even for SSH connection', async () => {
			// Arrange
			const preferences: Partial<SourceControlPreferences> = {
				connectionType: 'ssh',
				httpsUsername: 'user', // These should be encrypted and removed from preferences
				httpsPassword: 'token',
			};

			jest
				.spyOn(sourceControlPreferencesService as any, 'getKeyPairFromDatabase')
				.mockResolvedValue({});

			const saveSpy = jest
				.spyOn(sourceControlPreferencesService, 'saveHttpsCredentials')
				.mockResolvedValue(undefined);

			jest
				.spyOn(mockCipher, 'encrypt')
				.mockReturnValueOnce('encrypted_user')
				.mockReturnValueOnce('encrypted_pass');

			// Act
			const result = await sourceControlPreferencesService.setPreferences(preferences);

			// Assert - HTTPS credentials should always be encrypted and sanitized for security
			expect(saveSpy).toHaveBeenCalledWith('user', 'token');
			expect(result.httpsUsername).toBeUndefined();
			expect(result.httpsPassword).toBeUndefined();
			expect(result.connectionType).toBe('ssh');
		});
	});
});
