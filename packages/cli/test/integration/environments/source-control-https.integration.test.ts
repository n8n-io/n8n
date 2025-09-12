import { mockInstance } from '@n8n/backend-test-utils';
import { GLOBAL_OWNER_ROLE } from '@n8n/db';
import { Container } from '@n8n/di';

import { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';
import { SourceControlGitService } from '@/environments.ee/source-control/source-control-git.service.ee';
import { SourceControlService } from '@/environments.ee/source-control/source-control.service.ee';
import { Telemetry } from '@/telemetry';
import type { SourceControlPreferences } from '@/environments.ee/source-control/types/source-control-preferences';

import { createUser } from '../shared/db/users';
import * as utils from '../shared/utils';

mockInstance(Telemetry);

// Mock Git operations to prevent actual Git calls during integration tests
mockInstance(SourceControlGitService);
mockInstance(SourceControlService);

utils.setupTestServer({
	endpointGroups: ['sourceControl', 'license', 'auth'],
	enabledFeatures: ['feat:sourceControl', 'feat:sharing'],
});

let sourceControlPreferencesService: SourceControlPreferencesService;

beforeAll(async () => {
	await createUser({ role: GLOBAL_OWNER_ROLE });

	sourceControlPreferencesService = Container.get(SourceControlPreferencesService);

	// Mock the service methods that cause Git operations
	const sourceControlService = Container.get(SourceControlService);
	sourceControlService.getBranches = jest.fn().mockResolvedValue({
		branches: ['main', 'develop'],
		currentBranch: 'main',
	});
	sourceControlService.initializeRepository = jest.fn().mockResolvedValue(undefined);
	sourceControlService.init = jest.fn().mockResolvedValue(undefined);
});

describe('Source Control HTTPS Integration Tests', () => {
	beforeEach(async () => {
		// Reset preferences before each test
		await sourceControlPreferencesService.setPreferences({
			connected: false,
			protocol: 'ssh',
		} as SourceControlPreferences);
	});

	describe('HTTPS Authentication Flow', () => {
		test('should validate HTTPS preferences successfully with all required fields', async () => {
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			// Store preferences directly via the service to avoid Git operations
			await sourceControlPreferencesService.setPreferences(httpsPreferences);

			// Verify preferences were stored correctly
			const storedPrefs = sourceControlPreferencesService.getPreferences();
			expect(storedPrefs.protocol).toBe('https');
			expect(storedPrefs.username).toBe('testuser');
			expect(storedPrefs.personalAccessToken).toBe('ghp_test123456789');
			expect(storedPrefs.repositoryUrl).toBe('https://github.com/n8n-test/test-repo.git');
		});

		test('should validate HTTPS preferences with missing username', async () => {
			const invalidHttpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				personalAccessToken: 'ghp_test123456789',
				// Missing username
			};

			// Test validation directly via service to avoid Git operations
			await expect(
				sourceControlPreferencesService.validateSourceControlPreferences(invalidHttpsPreferences),
			).rejects.toThrow(/Invalid source control preferences/);
		});

		test('should validate HTTPS preferences with missing personal access token', async () => {
			const invalidHttpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				// Missing personalAccessToken
			};

			// Test validation directly via service to avoid Git operations
			await expect(
				sourceControlPreferencesService.validateSourceControlPreferences(invalidHttpsPreferences),
			).rejects.toThrow(/Invalid source control preferences/);
		});

		test('should store repository URL correctly', async () => {
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
			};

			await sourceControlPreferencesService.setPreferences(httpsPreferences);

			const storedPrefs = sourceControlPreferencesService.getPreferences();
			expect(storedPrefs.repositoryUrl).toBe('https://github.com/n8n-test/test-repo.git');
		});

		test('should handle protocol switching from SSH to HTTPS', async () => {
			// First set up SSH preferences
			await sourceControlPreferencesService.setPreferences({
				protocol: 'ssh' as const,
				repositoryUrl: 'git@github.com:n8n-test/test-repo.git',
				branchName: 'main',
				keyGeneratorType: 'ed25519',
			});

			// Switch to HTTPS
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
			};

			await sourceControlPreferencesService.setPreferences(httpsPreferences);

			const storedPrefs = sourceControlPreferencesService.getPreferences();
			expect(storedPrefs.protocol).toBe('https');
			expect(storedPrefs.username).toBe('testuser');
			expect(storedPrefs.personalAccessToken).toBe('ghp_test123456789');
		});

		test('should handle protocol switching from HTTPS to SSH', async () => {
			// First set up HTTPS preferences
			await sourceControlPreferencesService.setPreferences({
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
			});

			// Switch back to SSH
			const sshPreferences = {
				protocol: 'ssh' as const,
				repositoryUrl: 'git@github.com:n8n-test/test-repo.git',
				branchName: 'main',
				keyGeneratorType: 'ed25519' as const,
			};

			await sourceControlPreferencesService.setPreferences(sshPreferences);

			const storedPrefs = sourceControlPreferencesService.getPreferences();
			expect(storedPrefs.protocol).toBe('ssh');
			expect(storedPrefs.keyGeneratorType).toBe('ed25519');
		});
	});

	describe('HTTPS Security Features', () => {
		test('should encrypt personal access token in database', async () => {
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
			};

			// Store preferences with encryption
			await sourceControlPreferencesService.setPreferences(httpsPreferences, true);

			// Load preferences from database to verify decryption works
			await sourceControlPreferencesService.loadFromDbAndApplySourceControlPreferences();

			const storedPreferences = sourceControlPreferencesService.getPreferences();
			expect(storedPreferences.personalAccessToken).toBe('ghp_test123456789');
			expect(storedPreferences.protocol).toBe('https');
			expect(storedPreferences.username).toBe('testuser');
		});

		test('should sanitize credentials from API responses', async () => {
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
			};

			await sourceControlPreferencesService.setPreferences(httpsPreferences);

			// Get preferences for API response (should not contain sensitive data)
			const responsePrefs = sourceControlPreferencesService.getPreferencesForResponse();

			expect(responsePrefs).not.toHaveProperty('personalAccessToken');
			expect(responsePrefs.protocol).toBe('https');
			expect(responsePrefs.username).toBe('testuser');
		});

		test('should handle credential cleanup when switching protocols', async () => {
			// Set HTTPS with credentials
			await sourceControlPreferencesService.setPreferences({
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
			});

			// Switch to SSH using merge functionality (clears HTTPS credentials)
			const sshPreferences = {
				protocol: 'ssh' as const,
				repositoryUrl: 'git@github.com:n8n-test/test-repo.git',
				branchName: 'main',
			};

			await sourceControlPreferencesService.setPreferences(sshPreferences);

			// Verify HTTPS credentials are cleared via merge logic
			const preferences = sourceControlPreferencesService.getPreferences();
			expect(preferences.protocol).toBe('ssh');
			expect(preferences.username).toBeUndefined();
			expect(preferences.personalAccessToken).toBeUndefined();
		});
	});

	describe('HTTPS Repository Operations', () => {
		test('should validate HTTPS authentication setup', async () => {
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
				connected: true,
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			await sourceControlPreferencesService.setPreferences(httpsPreferences);

			// Verify HTTPS preferences are correctly stored
			const storedPrefs = sourceControlPreferencesService.getPreferences();
			expect(storedPrefs.protocol).toBe('https');
			expect(storedPrefs.username).toBe('testuser');
			expect(storedPrefs.personalAccessToken).toBe('ghp_test123456789');
			expect(storedPrefs.connected).toBe(true);
		});

		test('should handle HTTPS authentication validation', async () => {
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'valid_token',
			};

			// Should not throw for valid HTTPS preferences
			await expect(
				sourceControlPreferencesService.validateSourceControlPreferences(httpsPreferences),
			).resolves.not.toThrow();

			// Should throw for invalid HTTPS preferences (missing token)
			const invalidPrefs = { ...httpsPreferences, personalAccessToken: undefined };
			await expect(
				sourceControlPreferencesService.validateSourceControlPreferences(invalidPrefs),
			).rejects.toThrow(/Invalid source control preferences/);
		});
	});

	describe('Cross-Layer Integration', () => {
		test('should handle complete HTTPS workflow with preferences service', async () => {
			// Step 1: Configure HTTPS preferences
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
			};

			await sourceControlPreferencesService.setPreferences(httpsPreferences);

			// Step 2: Verify preferences are stored correctly
			const storedPreferences = sourceControlPreferencesService.getPreferences();
			expect(storedPreferences.protocol).toBe('https');
			expect(storedPreferences.username).toBe('testuser');
			expect(storedPreferences.personalAccessToken).toBe('ghp_test123456789');

			// Step 3: Verify API response sanitization
			const responsePrefs = sourceControlPreferencesService.getPreferencesForResponse();
			expect(responsePrefs.protocol).toBe('https');
			expect(responsePrefs.username).toBe('testuser');
			expect(responsePrefs).not.toHaveProperty('personalAccessToken');
		});
	});
});
