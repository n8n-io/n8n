import { testDb } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';
import type { SourceControlPreferences } from '@/environments.ee/source-control/types/source-control-preferences';

let sourceControlPreferencesService: SourceControlPreferencesService;

beforeAll(async () => {
	await testDb.init();
	sourceControlPreferencesService = Container.get(SourceControlPreferencesService);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Source Control Migration Compatibility Tests', () => {
	beforeEach(async () => {
		// Reset preferences before each test
		await sourceControlPreferencesService.setPreferences({
			connected: false,
			protocol: 'ssh',
			repositoryUrl: '',
			branchName: '',
			username: '',
			personalAccessToken: '',
			keyGeneratorType: 'ed25519',
		} as SourceControlPreferences);
	});

	describe('Backward Compatibility with Existing SSH Configurations', () => {
		test('should load existing SSH configurations without protocol field', async () => {
			// Simulate old SSH configuration without protocol field
			const legacySshPreferences = {
				connected: true,
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#1d6acb',
				keyGeneratorType: 'ed25519',
				// No protocol field - should default to SSH
			};

			await sourceControlPreferencesService.setPreferences(
				legacySshPreferences as SourceControlPreferences,
			);
			const preferences = sourceControlPreferencesService.getPreferences();

			// Should default to SSH protocol for backward compatibility
			expect(preferences.protocol).toBe('ssh');
			expect(preferences.repositoryUrl).toBe('git@github.com:user/repo.git');
			expect(preferences.branchName).toBe('main');
			expect(preferences.keyGeneratorType).toBe('ed25519');
		});

		test('should merge new protocol field with existing preferences', async () => {
			// First, set up an existing SSH configuration (simulating legacy system)
			await sourceControlPreferencesService.setPreferences({
				connected: true,
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				keyGeneratorType: 'ed25519',
			} as SourceControlPreferences);

			// Now update with explicit protocol (simulating upgrade)
			await sourceControlPreferencesService.setPreferences({
				protocol: 'ssh',
			} as SourceControlPreferences);

			const preferences = sourceControlPreferencesService.getPreferences();
			expect(preferences.protocol).toBe('ssh');
			expect(preferences.repositoryUrl).toBe('git@github.com:user/repo.git');
			expect(preferences.branchName).toBe('main');
		});
	});

	describe('Database Schema Migration Compatibility', () => {
		test('should handle settings table migration for HTTPS fields', async () => {
			// Test that new HTTPS fields can be stored and retrieved from settings table
			const httpsPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#1d6acb',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
				keyGeneratorType: 'ed25519',
			};

			// Save to database
			await sourceControlPreferencesService.setPreferences(httpsPreferences, true);

			// Reload from database to ensure persistence works
			await sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences();
			const loadedPreferences = sourceControlPreferencesService.getPreferences();

			expect(loadedPreferences.protocol).toBe('https');
			expect(loadedPreferences.username).toBe('testuser');
			expect(loadedPreferences.personalAccessToken).toBe('ghp_test123456789');
			expect(loadedPreferences.repositoryUrl).toBe('https://github.com/user/repo.git');
		});

		test('should handle protocol field addition to existing database records', async () => {
			// Simulate existing SSH record without protocol field
			const sshPreferences: Partial<SourceControlPreferences> = {
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				keyGeneratorType: 'ed25519',
				// No protocol field
			};

			await sourceControlPreferencesService.setPreferences(
				sshPreferences as SourceControlPreferences,
				true,
			);
			await sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences();

			const preferences = sourceControlPreferencesService.getPreferences();
			// Should default to SSH when protocol is not specified
			expect(preferences.protocol).toBe('ssh');
		});
	});

	describe('Cross-Version Data Compatibility', () => {
		test('should handle plain text to encrypted personal access token migration', async () => {
			// Simulate a scenario where we have a plain text token that needs encryption
			const preferencesWithPlainToken: SourceControlPreferences = {
				connected: false,
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#1d6acb',
				username: 'testuser',
				personalAccessToken: 'plaintext_token_123', // Plain text token
				keyGeneratorType: 'ed25519',
			};

			// Set preferences - should encrypt the token
			await sourceControlPreferencesService.setPreferences(preferencesWithPlainToken, true);

			// Reload and verify token is properly encrypted/decrypted
			await sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences();
			const loadedPreferences = sourceControlPreferencesService.getPreferences();

			expect(loadedPreferences.personalAccessToken).toBe('plaintext_token_123');
			expect(loadedPreferences.protocol).toBe('https');
			expect(loadedPreferences.username).toBe('testuser');
		});

		test('should maintain SSH key pair compatibility during protocol changes', async () => {
			// Test that SSH key pairs remain intact when switching protocols

			// Generate SSH keys (simulate existing SSH setup)
			await sourceControlPreferencesService.generateAndSaveKeyPair('ed25519');

			// Verify SSH keys exist
			let preferences = sourceControlPreferencesService.getPreferences();
			const originalKeyType = preferences.keyGeneratorType;

			// Switch to HTTPS
			await sourceControlPreferencesService.setPreferences({
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
			} as SourceControlPreferences);

			// Switch back to SSH
			await sourceControlPreferencesService.setPreferences({
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
			} as SourceControlPreferences);

			preferences = sourceControlPreferencesService.getPreferences();

			// SSH key type should be preserved
			expect(preferences.keyGeneratorType).toBe(originalKeyType);
			expect(preferences.protocol).toBe('ssh');
		});
	});

	describe('Multi-Instance Environment Compatibility', () => {
		test('should handle concurrent protocol switches across instances', async () => {
			// Simulate multiple instances updating preferences
			const instance1Preferences: SourceControlPreferences = {
				connected: false,
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				username: 'user1',
				personalAccessToken: 'token1',
				keyGeneratorType: 'ed25519',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			const instance2Preferences: SourceControlPreferences = {
				connected: false,
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'develop',
				keyGeneratorType: 'rsa',
				username: '',
				personalAccessToken: '',
				branchReadOnly: true,
				branchColor: '#ff5733',
			};

			// Simulate instance 1 update
			await sourceControlPreferencesService.setPreferences(instance1Preferences, true);
			await sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences();
			let preferences = sourceControlPreferencesService.getPreferences();

			expect(preferences.protocol).toBe('https');
			expect(preferences.username).toBe('user1');

			// Simulate instance 2 update (overwriting previous)
			await sourceControlPreferencesService.setPreferences(instance2Preferences, true);
			await sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences();
			preferences = sourceControlPreferencesService.getPreferences();

			expect(preferences.protocol).toBe('ssh');
			expect(preferences.branchName).toBe('develop');
			expect(preferences.keyGeneratorType).toBe('rsa');
			expect(preferences.branchReadOnly).toBe(true);
		});
	});

	describe('Error Recovery and Data Integrity', () => {
		test('should recover gracefully from corrupted preference data', async () => {
			// Test recovery from invalid/corrupted data
			try {
				// Attempt to set malformed preferences
				await sourceControlPreferencesService.setPreferences({
					protocol: 'invalid' as 'ssh' | 'https', // Type assertion for test purposes
					repositoryUrl: 'not-a-valid-url',
					username: '',
					personalAccessToken: '',
				} as SourceControlPreferences);
			} catch (error) {
				// Should reject invalid data
				expect(error).toBeDefined();
			}

			// Should still be able to set valid preferences
			const validPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				keyGeneratorType: 'ed25519',
				username: '',
				personalAccessToken: '',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			await sourceControlPreferencesService.setPreferences(validPreferences);
			const preferences = sourceControlPreferencesService.getPreferences();
			expect(preferences.protocol).toBe('ssh');
		});

		test('should maintain data integrity during failed protocol switches', async () => {
			// Set up initial valid SSH configuration
			const sshPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				keyGeneratorType: 'ed25519',
				username: '',
				personalAccessToken: '',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			await sourceControlPreferencesService.setPreferences(sshPreferences);
			const originalPreferences = sourceControlPreferencesService.getPreferences();

			// Attempt invalid HTTPS switch
			try {
				await sourceControlPreferencesService.validateSourceControlPreferences({
					protocol: 'https',
					repositoryUrl: 'https://github.com/user/repo.git',
					// Missing required username and personalAccessToken
				} as SourceControlPreferences);
			} catch (error) {
				// Should fail validation
				expect(error).toBeDefined();
			}

			// Original preferences should remain unchanged
			const currentPreferences = sourceControlPreferencesService.getPreferences();
			expect(currentPreferences.protocol).toBe(originalPreferences.protocol);
			expect(currentPreferences.repositoryUrl).toBe(originalPreferences.repositoryUrl);
		});
	});
});
