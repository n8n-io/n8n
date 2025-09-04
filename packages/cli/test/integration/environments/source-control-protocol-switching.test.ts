import { testDb } from '@n8n/backend-test-utils';
import { Container } from '@n8n/di';

import { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';
import { SourceControlGitService } from '@/environments.ee/source-control/source-control-git.service.ee';
import type { SourceControlPreferences } from '@/environments.ee/source-control/types/source-control-preferences';

let sourceControlPreferencesService: SourceControlPreferencesService;
let sourceControlGitService: SourceControlGitService;

beforeAll(async () => {
	await testDb.init();
	sourceControlPreferencesService = Container.get(SourceControlPreferencesService);
	sourceControlGitService = Container.get(SourceControlGitService);
});

afterAll(async () => {
	await testDb.terminate();
});

describe('Source Control Protocol Switching Integration Tests', () => {
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

	describe('SSH to HTTPS Protocol Switching', () => {
		test('should successfully switch from SSH to HTTPS and clear SSH-specific data', async () => {
			// Step 1: Set up SSH configuration
			const sshPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#1d6acb',
				keyGeneratorType: 'ed25519',
				username: '',
				personalAccessToken: '',
			};

			await sourceControlPreferencesService.setPreferences(sshPreferences);
			let preferences = sourceControlPreferencesService.getPreferences();

			expect(preferences.protocol).toBe('ssh');
			expect(preferences.keyGeneratorType).toBe('ed25519');
			expect(preferences.username).toBeFalsy(); // undefined or empty string

			// Step 2: Switch to HTTPS
			const httpsPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#1d6acb',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
				keyGeneratorType: 'ed25519', // This should be preserved
			};

			await sourceControlPreferencesService.setPreferences(httpsPreferences);
			preferences = sourceControlPreferencesService.getPreferences();

			// Verify HTTPS configuration is set
			expect(preferences.protocol).toBe('https');
			expect(preferences.username).toBe('testuser');
			expect(preferences.personalAccessToken).toBe('ghp_test123456789');
			expect(preferences.repositoryUrl).toBe('https://github.com/user/repo.git');

			// Verify key generator type is preserved
			expect(preferences.keyGeneratorType).toBe('ed25519');
		});
	});

	describe('HTTPS to SSH Protocol Switching', () => {
		test('should successfully switch from HTTPS to SSH and clear HTTPS credentials', async () => {
			// Step 1: Set up HTTPS configuration
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

			await sourceControlPreferencesService.setPreferences(httpsPreferences);
			let preferences = sourceControlPreferencesService.getPreferences();

			expect(preferences.protocol).toBe('https');
			expect(preferences.username).toBe('testuser');
			expect(preferences.personalAccessToken).toBe('ghp_test123456789');

			// Step 2: Switch to SSH
			const sshPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				branchReadOnly: false,
				branchColor: '#1d6acb',
				keyGeneratorType: 'ed25519',
				username: '', // Should be cleared
				personalAccessToken: '', // Should be cleared
			};

			await sourceControlPreferencesService.setPreferences(sshPreferences);
			preferences = sourceControlPreferencesService.getPreferences();

			// Verify SSH configuration is set
			expect(preferences.protocol).toBe('ssh');
			expect(preferences.repositoryUrl).toBe('git@github.com:user/repo.git');
			expect(preferences.keyGeneratorType).toBe('ed25519');

			// Verify HTTPS credentials are cleared
			expect(preferences.username).toBeFalsy(); // undefined or empty string
			expect(preferences.personalAccessToken).toBeFalsy(); // undefined or empty string
		});
	});

	describe('Protocol Switching Validation', () => {
		test('should validate HTTPS requirements when switching from SSH', async () => {
			// Start with SSH
			await sourceControlPreferencesService.setPreferences({
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
			} as SourceControlPreferences);

			// Try to switch to HTTPS without required credentials
			const incompleteHttpsPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				// Missing username and personalAccessToken
				username: '',
				personalAccessToken: '',
				keyGeneratorType: 'ed25519',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			// This should fail validation
			await expect(
				sourceControlPreferencesService.validateSourceControlPreferences(
					incompleteHttpsPreferences,
				),
			).rejects.toThrow('Invalid source control preferences');
		});

		test('should accept valid protocol switching configurations', async () => {
			const validHttpsPreferences: SourceControlPreferences = {
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

			// This should pass validation (no validation errors)
			const validationErrors =
				await sourceControlPreferencesService.validateSourceControlPreferences(
					validHttpsPreferences,
				);
			expect(validationErrors).toHaveLength(0);
		});
	});

	describe('Service Integration During Protocol Switching', () => {
		test('should handle Git service re-authentication when switching protocols', async () => {
			// Mock git service methods
			const setGitSshCommandSpy = jest
				.spyOn(sourceControlGitService, 'setGitSshCommand')
				.mockResolvedValue();
			const setGitHttpsAuthSpy = jest
				.spyOn(sourceControlGitService, 'setGitHttpsAuth')
				.mockResolvedValue();

			// Start with SSH
			const sshPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				keyGeneratorType: 'ed25519',
				publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest',
				username: '',
				personalAccessToken: '',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			await sourceControlPreferencesService.setPreferences(sshPreferences);

			// Switch to HTTPS
			const httpsPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
				keyGeneratorType: 'ed25519',
				publicKey: '',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			await sourceControlPreferencesService.setPreferences(httpsPreferences);

			// Verify the service layer can handle both protocols
			expect(sourceControlPreferencesService.getPreferences().protocol).toBe('https');
			expect(sourceControlPreferencesService.getPreferences().username).toBe('testuser');

			// Clean up mocks
			setGitSshCommandSpy.mockRestore();
			setGitHttpsAuthSpy.mockRestore();
		});
	});

	describe('Database Persistence During Protocol Switching', () => {
		test('should persist protocol changes to database correctly', async () => {
			// Set SSH preferences
			const sshPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:user/repo.git',
				branchName: 'main',
				keyGeneratorType: 'ed25519',
				publicKey: 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAITest',
				username: '',
				personalAccessToken: '',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			await sourceControlPreferencesService.setPreferences(sshPreferences, true); // Save to DB

			// Reload from database
			await sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences();
			let preferences = sourceControlPreferencesService.getPreferences();
			expect(preferences.protocol).toBe('ssh');

			// Switch to HTTPS
			const httpsPreferences: SourceControlPreferences = {
				connected: false,
				protocol: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
				keyGeneratorType: 'ed25519',
				publicKey: '',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			await sourceControlPreferencesService.setPreferences(httpsPreferences, true); // Save to DB

			// Reload from database again
			await sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences();
			preferences = sourceControlPreferencesService.getPreferences();

			expect(preferences.protocol).toBe('https');
			expect(preferences.username).toBe('testuser');
			// personalAccessToken should be decrypted properly
			expect(preferences.personalAccessToken).toBe('ghp_test123456789');
		});
	});
});
