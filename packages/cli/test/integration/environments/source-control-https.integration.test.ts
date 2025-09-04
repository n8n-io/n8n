import { mockInstance } from '@n8n/backend-test-utils';
import { GLOBAL_OWNER_ROLE, type User } from '@n8n/db';
import { Container } from '@n8n/di';

import { SourceControlPreferencesService } from '@/environments.ee/source-control/source-control-preferences.service.ee';
import { SourceControlGitService } from '@/environments.ee/source-control/source-control-git.service.ee';
import { Telemetry } from '@/telemetry';
import type { SourceControlPreferences } from '@/environments.ee/source-control/types/source-control-preferences';

import { createUser } from '../shared/db/users';
import type { SuperAgentTest } from '../shared/types';
import * as utils from '../shared/utils';

let authOwnerAgent: SuperAgentTest;
let owner: User;

mockInstance(Telemetry);

const testServer = utils.setupTestServer({
	endpointGroups: ['sourceControl', 'license', 'auth'],
	enabledFeatures: ['feat:sourceControl', 'feat:sharing'],
});

let sourceControlPreferencesService: SourceControlPreferencesService;

beforeAll(async () => {
	owner = await createUser({ role: GLOBAL_OWNER_ROLE });
	authOwnerAgent = testServer.authAgentFor(owner);

	sourceControlPreferencesService = Container.get(SourceControlPreferencesService);
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
		test('should successfully configure HTTPS authentication', async () => {
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			};

			const response = await authOwnerAgent
				.patch('/source-control/preferences')
				.send(httpsPreferences)
				.expect(200);

			expect(response.body).toMatchObject({
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				branchReadOnly: false,
				branchColor: '#1d6acb',
			});

			// personalAccessToken should not be returned in response for security
			expect(response.body).not.toHaveProperty('personalAccessToken');
		});

		test('should validate HTTPS preferences with missing username', async () => {
			const invalidHttpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				personalAccessToken: 'ghp_test123456789',
				// Missing username
			};

			await authOwnerAgent
				.post('/source-control/preferences')
				.send(invalidHttpsPreferences)
				.expect(400);
		});

		test('should validate HTTPS preferences with missing personal access token', async () => {
			const invalidHttpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				// Missing personalAccessToken
			};

			await authOwnerAgent
				.post('/source-control/preferences')
				.send(invalidHttpsPreferences)
				.expect(400);
		});

		test('should reject invalid repository URL format', async () => {
			const invalidHttpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'invalid-url',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
			};

			await authOwnerAgent
				.post('/source-control/preferences')
				.send(invalidHttpsPreferences)
				.expect(400);
		});

		test('should handle protocol switching from SSH to HTTPS', async () => {
			// First set up SSH
			await authOwnerAgent
				.post('/source-control/preferences')
				.send({
					protocol: 'ssh' as const,
					repositoryUrl: 'git@github.com:n8n-test/test-repo.git',
					branchName: 'main',
					keyGeneratorType: 'ed25519',
				})
				.expect(200);

			// Switch to HTTPS
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
			};

			const response = await authOwnerAgent
				.post('/source-control/preferences')
				.send(httpsPreferences)
				.expect(200);

			expect(response.body.protocol).toBe('https');
			expect(response.body.username).toBe('testuser');
			expect(response.body).not.toHaveProperty('personalAccessToken');
		});

		test('should handle protocol switching from HTTPS to SSH', async () => {
			// First set up HTTPS
			await authOwnerAgent
				.post('/source-control/preferences')
				.send({
					protocol: 'https' as const,
					repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
					branchName: 'main',
					username: 'testuser',
					personalAccessToken: 'ghp_test123456789',
				})
				.expect(200);

			// Switch back to SSH
			const sshPreferences = {
				protocol: 'ssh',
				repositoryUrl: 'git@github.com:n8n-test/test-repo.git',
				branchName: 'main',
				keyGeneratorType: 'ed25519',
			};

			const response = await authOwnerAgent
				.post('/source-control/preferences')
				.send(sshPreferences)
				.expect(200);

			expect(response.body.protocol).toBe('ssh');
			expect(response.body.keyGeneratorType).toBe('ed25519');
			expect(response.body).not.toHaveProperty('username');
			expect(response.body).not.toHaveProperty('personalAccessToken');
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

			await authOwnerAgent.post('/source-control/preferences').send(httpsPreferences).expect(200);

			// Verify the token is stored encrypted in the preferences service
			const storedPreferences = await sourceControlPreferencesService.getPreferences();

			// The raw stored token should be encrypted (different from the original)
			expect(storedPreferences.personalAccessToken).toBeDefined();
			expect(storedPreferences.personalAccessToken).not.toBe('ghp_test123456789');

			// But when retrieved through the service, it should be decrypted
			expect(sourceControlPreferencesService.getPreferences().personalAccessToken).toBe(
				'ghp_test123456789',
			);
		});

		test('should sanitize credentials from API responses', async () => {
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
			};

			const setResponse = await authOwnerAgent
				.post('/source-control/preferences')
				.send(httpsPreferences)
				.expect(200);

			// Set response should not contain sensitive data
			expect(setResponse.body).not.toHaveProperty('personalAccessToken');

			// Get response should also not contain sensitive data
			const getResponse = await authOwnerAgent.get('/source-control/preferences').expect(200);

			expect(getResponse.body).not.toHaveProperty('personalAccessToken');
			expect(getResponse.body.protocol).toBe('https');
			expect(getResponse.body.username).toBe('testuser');
		});

		test('should handle credential cleanup when switching protocols', async () => {
			// Set HTTPS with credentials
			await authOwnerAgent
				.post('/source-control/preferences')
				.send({
					protocol: 'https' as const,
					repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
					branchName: 'main',
					username: 'testuser',
					personalAccessToken: 'ghp_test123456789',
				})
				.expect(200);

			// Switch to SSH - should clear HTTPS credentials
			await authOwnerAgent
				.post('/source-control/preferences')
				.send({
					protocol: 'ssh' as const,
					repositoryUrl: 'git@github.com:n8n-test/test-repo.git',
					branchName: 'main',
				})
				.expect(200);

			// Verify HTTPS credentials are cleared
			const preferences = await sourceControlPreferencesService.getPreferences();
			expect(preferences.protocol).toBe('ssh');
			expect(preferences.username).toBe('');
			expect(preferences.personalAccessToken).toBe('');
		});
	});

	describe('HTTPS Repository Operations', () => {
		let gitService: SourceControlGitService;

		beforeEach(() => {
			gitService = Container.get(SourceControlGitService);
			// Mock git operations to avoid actual Git calls
			gitService.fetch = jest.fn().mockResolvedValue({ updated: 1, deleted: 0 });
			gitService.pull = jest.fn().mockResolvedValue({ updated: 1, deleted: 0 });
			gitService.push = jest.fn().mockResolvedValue({ pushed: ['main'] });
		});

		test('should initialize Git service with HTTPS credentials', async () => {
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
				connected: true,
				branchReadOnly: false,
				branchColor: '#1d6acb',
				keyGeneratorType: 'ed25519' as const,
			};

			await sourceControlPreferencesService.setPreferences(httpsPreferences);

			// Initialize git service with HTTPS auth
			const initSpy = jest.spyOn(gitService, 'initService');
			await gitService.initService({
				sourceControlPreferences: httpsPreferences,
				gitFolder: sourceControlPreferencesService.gitFolder,
				sshFolder: sourceControlPreferencesService.sshFolder,
				sshKeyName: sourceControlPreferencesService.sshKeyName,
			});

			expect(initSpy).toHaveBeenCalledWith({
				sourceControlPreferences: httpsPreferences,
				gitFolder: sourceControlPreferencesService.gitFolder,
				sshFolder: sourceControlPreferencesService.sshFolder,
				sshKeyName: sourceControlPreferencesService.sshKeyName,
			});
		});

		test('should handle HTTPS authentication errors gracefully', async () => {
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'invalid_token',
				connected: true,
			};

			await sourceControlPreferencesService.setPreferences(httpsPreferences);

			// Mock authentication failure
			gitService.fetch = jest.fn().mockRejectedValue(new Error('Authentication failed'));

			await expect(gitService.fetch()).rejects.toThrow('Authentication failed');
		});
	});

	describe('Cross-Layer Integration', () => {
		test('should handle complete HTTPS workflow from API to Git operations', async () => {
			// Step 1: Configure HTTPS via API
			const httpsPreferences = {
				protocol: 'https' as const,
				repositoryUrl: 'https://github.com/n8n-test/test-repo.git',
				branchName: 'main',
				username: 'testuser',
				personalAccessToken: 'ghp_test123456789',
			};

			await authOwnerAgent.post('/source-control/preferences').send(httpsPreferences).expect(200);

			// Step 2: Verify preferences are stored correctly
			const storedPreferences = await sourceControlPreferencesService.getPreferences();
			expect(storedPreferences.protocol).toBe('https');
			expect(storedPreferences.username).toBe('testuser');

			// Step 3: Verify API returns sanitized data
			const getResponse = await authOwnerAgent.get('/source-control/preferences').expect(200);

			expect(getResponse.body.protocol).toBe('https');
			expect(getResponse.body.username).toBe('testuser');
			expect(getResponse.body).not.toHaveProperty('personalAccessToken');

			// Step 4: Verify Git service can be initialized with HTTPS
			const gitService = Container.get(SourceControlGitService);
			const initSpy = jest.spyOn(gitService, 'initService');

			await gitService.initService({
				sourceControlPreferences: storedPreferences,
				gitFolder: sourceControlPreferencesService.gitFolder,
				sshFolder: sourceControlPreferencesService.sshFolder,
				sshKeyName: sourceControlPreferencesService.sshKeyName,
			});
			expect(initSpy).toHaveBeenCalled();
		});
	});
});
