import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { simpleGit } from 'simple-git';
import type { SimpleGit } from 'simple-git';
import { UnexpectedError } from 'n8n-workflow';

import { SourceControlGitService } from '../source-control-git.service.ee';
import type { SourceControlPreferences } from '../types/source-control-preferences';
import type { SourceControlPreferencesService } from '../source-control-preferences.service.ee';

const MOCK_BRANCHES = {
	all: ['origin/master', 'origin/feature/branch'],
	branches: {
		'origin/master': {},
		'origin/feature/branch': {},
	},
	current: 'master',
};

const mockGitInstance = {
	branch: jest.fn().mockResolvedValue(MOCK_BRANCHES),
	env: jest.fn().mockReturnThis(),
	fetch: jest.fn().mockResolvedValue({ updated: 1, deleted: 0 }),
	pull: jest.fn().mockResolvedValue({ updated: 1, deleted: 0 }),
	push: jest.fn().mockResolvedValue({ pushed: ['main'] }),
	init: jest.fn().mockResolvedValue({}),
	checkIsRepo: jest.fn().mockResolvedValue(true),
	status: jest.fn().mockResolvedValue({ modified: [], staged: [] }),
	getRemotes: jest.fn().mockResolvedValue([]),
	addRemote: jest.fn().mockResolvedValue({}),
	addConfig: jest.fn().mockResolvedValue({}),
	checkout: jest.fn().mockResolvedValue({}),
};

jest.mock('simple-git', () => {
	return {
		simpleGit: jest.fn().mockImplementation(() => mockGitInstance),
	};
});

jest.mock('child_process', () => ({
	execSync: jest.fn().mockReturnValue('git version 2.40.0'),
}));

jest.mock('../source-control-helper.ee', () => ({
	sourceControlFoldersExistCheck: jest.fn(),
}));

describe('SourceControlGitService', () => {
	const sourceControlGitService = new SourceControlGitService(mock(), mock(), mock());

	beforeEach(() => {
		sourceControlGitService.git = simpleGit();
	});

	describe('getBranches', () => {
		it('should support branch names containing slashes', async () => {
			const branches = await sourceControlGitService.getBranches();
			expect(branches.branches).toEqual(['master', 'feature/branch']);
		});
	});

	describe('initRepository', () => {
		describe('when local repo is set up after remote is ready', () => {
			it('should track remote', async () => {
				/**
				 * Arrange
				 */
				const mockPreferences = mock<SourceControlPreferencesService>();
				const gitService = new SourceControlGitService(mock(), mock(), mockPreferences);
				const prefs = mock<SourceControlPreferences>({
					branchName: 'main',
					repositoryUrl: 'https://github.com/user/repo.git',
					initRepo: true,
				});
				const user = mock<User>({
					firstName: 'Test',
					lastName: 'User',
					email: 'test@example.com',
				});
				const git = mock<SimpleGit>();
				const checkoutSpy = jest.spyOn(git, 'checkout');
				const branchSpy = jest.spyOn(git, 'branch');
				const fetchSpy = jest.spyOn(git, 'fetch').mockResolvedValue({} as any);
				gitService.git = git;
				jest.spyOn(gitService, 'setGitSshCommand').mockResolvedValue();
				jest
					.spyOn(gitService, 'getBranches')
					.mockResolvedValue({ currentBranch: '', branches: ['main'] });

				// Mock preferences service to return SSH protocol for reAuthenticate
				mockPreferences.getPreferences.mockReturnValue({
					protocol: 'ssh',
					branchName: 'main',
					repositoryUrl: 'https://github.com/user/repo.git',
				} as SourceControlPreferences);

				/**
				 * Act
				 */
				await gitService.initRepository(prefs, user);

				/**
				 * Assert
				 */
				expect(fetchSpy).toHaveBeenCalled();
				expect(checkoutSpy).toHaveBeenCalledWith('main');
				expect(branchSpy).toHaveBeenCalledWith(['--set-upstream-to=origin/main', 'main']);
			});
		});
	});

	describe('getFileContent', () => {
		it('should return file content at HEAD version', async () => {
			// Arrange
			const filePath = 'workflows/12345.json';
			const expectedContent = '{"id":"12345","name":"Test Workflow"}';
			const git = mock<SimpleGit>();
			const showSpy = jest.spyOn(git, 'show');
			showSpy.mockResolvedValue(expectedContent);
			sourceControlGitService.git = git;

			// Act
			const content = await sourceControlGitService.getFileContent(filePath);

			// Assert
			expect(showSpy).toHaveBeenCalledWith([`HEAD:${filePath}`]);
			expect(content).toBe(expectedContent);
		});

		it('should return file content at specific commit', async () => {
			// Arrange
			const filePath = 'workflows/12345.json';
			const commitHash = 'abc123';
			const expectedContent = '{"id":"12345","name":"Test Workflow"}';
			const git = mock<SimpleGit>();
			const showSpy = jest.spyOn(git, 'show');
			showSpy.mockResolvedValue(expectedContent);
			sourceControlGitService.git = git;

			// Act
			const content = await sourceControlGitService.getFileContent(filePath, commitHash);

			// Assert
			expect(showSpy).toHaveBeenCalledWith([`${commitHash}:${filePath}`]);
			expect(content).toBe(expectedContent);
		});
	});

	describe('path normalization', () => {
		describe('cross-platform path handling', () => {
			beforeEach(() => {
				jest.clearAllMocks();
			});

			it('should normalize Windows paths to POSIX format for SSH command', async () => {
				// Arrange
				const mockPreferencesService = mock<SourceControlPreferencesService>();
				const windowsPath = 'C:\\Users\\Test\\.n8n\\ssh_private_key_temp';
				const sshFolder = 'C:\\Users\\Test\\.n8n\\.ssh';

				// Mock the getPrivateKeyPath to return a Windows path
				(mockPreferencesService.getPrivateKeyPath as jest.Mock).mockResolvedValue(windowsPath);

				const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);

				// Act
				await gitService.setGitSshCommand('/git/folder', sshFolder);

				// Assert - verify Windows paths are normalized to POSIX format
				expect(mockGitInstance.env).toHaveBeenCalledWith(
					'GIT_SSH_COMMAND',
					expect.stringContaining('C:/Users/Test/.n8n/ssh_private_key_temp'), // Forward slashes
				);
				expect(mockGitInstance.env).toHaveBeenCalledWith(
					'GIT_SSH_COMMAND',
					expect.stringContaining('C:/Users/Test/.n8n/.ssh/known_hosts'), // Forward slashes
				);
				// Ensure no backslashes remain in the SSH command
				expect(mockGitInstance.env).toHaveBeenCalledWith(
					'GIT_SSH_COMMAND',
					expect.not.stringContaining('\\'),
				);
			});

			it('should create properly quoted SSH command', async () => {
				// Arrange
				const mockPreferencesService = mock<SourceControlPreferencesService>();
				const privateKeyPath = 'C:/Users/Test User/.n8n/ssh_private_key_temp';
				const sshFolder = 'C:/Users/Test User/.n8n/.ssh';

				// Mock the getPrivateKeyPath to return a path with spaces
				(mockPreferencesService.getPrivateKeyPath as jest.Mock).mockResolvedValue(privateKeyPath);

				const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);

				// Act
				await gitService.setGitSshCommand('/git/folder', sshFolder);

				// Assert - verify paths with spaces are properly quoted
				expect(mockGitInstance.env).toHaveBeenCalledWith(
					'GIT_SSH_COMMAND',
					expect.stringContaining('"C:/Users/Test User/.n8n/ssh_private_key_temp"'), // Quoted path with spaces
				);
				expect(mockGitInstance.env).toHaveBeenCalledWith(
					'GIT_SSH_COMMAND',
					expect.stringContaining('"C:/Users/Test User/.n8n/.ssh/known_hosts"'), // Quoted known_hosts path
				);
				expect(mockGitInstance.env).toHaveBeenCalledWith(
					'GIT_SSH_COMMAND',
					expect.stringContaining('UserKnownHostsFile='),
				);
				expect(mockGitInstance.env).toHaveBeenCalledWith(
					'GIT_SSH_COMMAND',
					expect.stringContaining('StrictHostKeyChecking=no'),
				);
			});

			it('should escape double quotes in paths to prevent command injection', async () => {
				// Arrange
				const mockPreferencesService = mock<SourceControlPreferencesService>();
				const pathWithQuotes = 'C:/Users/Test"User/.n8n/ssh_private_key_temp';
				const sshFolder = 'C:/Users/Test"User/.n8n/.ssh';

				// Mock the getPrivateKeyPath to return a path with quotes
				(mockPreferencesService.getPrivateKeyPath as jest.Mock).mockResolvedValue(pathWithQuotes);

				const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);

				// Act
				await gitService.setGitSshCommand('/git/folder', sshFolder);

				// Assert - verify the SSH command was properly escaped
				expect(mockGitInstance.env).toHaveBeenCalledWith(
					'GIT_SSH_COMMAND',
					expect.stringContaining('Test\\"User'), // Escaped quote
				);
				expect(mockGitInstance.env).toHaveBeenCalledWith(
					'GIT_SSH_COMMAND',
					expect.not.stringContaining('Test"User'), // No unescaped quote in final command
				);
			});
		});
	});

	describe('HTTPS Authentication', () => {
		let mockPreferencesService: SourceControlPreferencesService;
		let gitService: SourceControlGitService;

		beforeEach(() => {
			jest.clearAllMocks();
			mockPreferencesService = mock<SourceControlPreferencesService>();
			(mockPreferencesService as any).gitFolder = '/test/git';
			gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);
		});

		describe('setGitHttpsAuth', () => {
			it('should configure Git with HTTPS credentials using environment variables', async () => {
				// Arrange
				const username = 'testuser';
				const token = 'ghp_test123';
				const gitFolder = '/test/git';

				// Act
				await gitService.setGitHttpsAuth(gitFolder, username, token);

				// Assert
				expect(gitService.git).toBeDefined();
				expect(mockGitInstance.env).toHaveBeenCalledWith('GIT_TERMINAL_PROMPT', '0');
				expect(mockGitInstance.env).toHaveBeenCalledWith('GIT_ASKPASS', 'echo');
				expect(mockGitInstance.env).toHaveBeenCalledWith('GIT_USERNAME', username);
				expect(mockGitInstance.env).toHaveBeenCalledWith('GIT_PASSWORD', token);
			});

			it('should throw error when username is missing', async () => {
				// Arrange
				const token = 'ghp_test123';
				const gitFolder = '/test/git';

				// Act & Assert
				await expect(gitService.setGitHttpsAuth(gitFolder, '', token)).rejects.toThrow(
					UnexpectedError,
				);
				await expect(gitService.setGitHttpsAuth(gitFolder, '', token)).rejects.toThrow(
					'Username and personal access token are required for HTTPS authentication',
				);
			});

			it('should throw error when personal access token is missing', async () => {
				// Arrange
				const username = 'testuser';
				const gitFolder = '/test/git';

				// Act & Assert
				await expect(gitService.setGitHttpsAuth(gitFolder, username, '')).rejects.toThrow(
					UnexpectedError,
				);
				await expect(gitService.setGitHttpsAuth(gitFolder, username, '')).rejects.toThrow(
					'Username and personal access token are required for HTTPS authentication',
				);
			});

			it('should configure Git options correctly for HTTPS', async () => {
				// Arrange
				const username = 'testuser';
				const token = 'ghp_test123';
				const gitFolder = '/test/git';

				// Act
				await gitService.setGitHttpsAuth(gitFolder, username, token);

				// Assert - Check git options are set correctly
				expect(simpleGit).toHaveBeenCalledWith({
					baseDir: gitFolder,
					binary: 'git',
					maxConcurrentProcesses: 6,
					trimmed: false,
					config: ['credential.helper='],
				});
			});
		});

		describe('initService with HTTPS', () => {
			it('should initialize service with HTTPS protocol and valid credentials', async () => {
				// Arrange
				const { execSync } = require('child_process');
				execSync.mockReturnValue('git version 2.40.0');

				const preferences: SourceControlPreferences = {
					protocol: 'https',
					username: 'testuser',
					personalAccessToken: 'ghp_test123',
					repositoryUrl: 'https://github.com/user/repo.git',
					branchName: 'main',
					connected: true,
					branchReadOnly: false,
					branchColor: '#000000',
					initRepo: false, // Don't initialize repo to avoid complex setup
				};

				const options = {
					sourceControlPreferences: preferences,
					gitFolder: '/test/git',
					sshFolder: '/test/ssh',
					sshKeyName: 'key',
				};

				// Mock repository existence check
				mockGitInstance.checkIsRepo.mockResolvedValueOnce(true);

				// Mock hasRemote to return true to skip initRepository
				mockGitInstance.getRemotes.mockResolvedValueOnce([
					{
						name: 'origin',
						refs: {
							push: preferences.repositoryUrl,
							fetch: preferences.repositoryUrl,
						},
					},
				]);

				// Act
				await gitService.initService(options);

				// Assert
				expect(execSync).toHaveBeenCalledWith('git --version', expect.any(Object));
				expect(mockGitInstance.env).toHaveBeenCalledWith('GIT_USERNAME', 'testuser');
				expect(mockGitInstance.env).toHaveBeenCalledWith('GIT_PASSWORD', 'ghp_test123');
				expect(gitService.git).toBeDefined();
			});

			it('should throw error when HTTPS credentials are missing in preferences', async () => {
				// Arrange
				const { execSync } = require('child_process');
				execSync.mockReturnValue('git version 2.40.0');

				const preferences: SourceControlPreferences = {
					protocol: 'https',
					repositoryUrl: 'https://github.com/user/repo.git',
					branchName: 'main',
					connected: true,
					branchReadOnly: false,
					branchColor: '#000000',
					// Missing username and personalAccessToken
				};

				const options = {
					sourceControlPreferences: preferences,
					gitFolder: '/test/git',
					sshFolder: '/test/ssh',
					sshKeyName: 'key',
				};

				// Act & Assert
				await expect(gitService.initService(options)).rejects.toThrow(UnexpectedError);
				await expect(gitService.initService(options)).rejects.toThrow(
					'Username and personal access token are required for HTTPS authentication',
				);
			});

			it('should initialize service with SSH protocol for backward compatibility', async () => {
				// Arrange
				const { execSync } = require('child_process');
				execSync.mockReturnValueOnce('git version 2.40.0').mockReturnValueOnce('OpenSSH_8.0');

				const preferences: SourceControlPreferences = {
					protocol: 'ssh',
					repositoryUrl: 'git@github.com:user/repo.git',
					branchName: 'main',
					connected: true,
					branchReadOnly: false,
					branchColor: '#000000',
					initRepo: false,
				};

				const options = {
					sourceControlPreferences: preferences,
					gitFolder: '/test/git',
					sshFolder: '/test/ssh',
					sshKeyName: 'key',
				};

				(mockPreferencesService.getPrivateKeyPath as jest.Mock).mockResolvedValue(
					'/test/ssh/private_key',
				);

				// Mock setGitSshCommand to set up git instance properly
				const setGitSshCommandSpy = jest
					.spyOn(gitService, 'setGitSshCommand')
					.mockImplementation(async () => {
						gitService.git = mockGitInstance as any;
					});

				// Mock repository and remote checks
				mockGitInstance.checkIsRepo.mockResolvedValueOnce(true);
				mockGitInstance.getRemotes.mockResolvedValueOnce([
					{
						name: 'origin',
						refs: {
							push: preferences.repositoryUrl,
							fetch: preferences.repositoryUrl,
						},
					},
				]);

				// Act
				await gitService.initService(options);

				// Assert
				expect(execSync).toHaveBeenCalledWith('ssh -V', expect.any(Object));
				expect(setGitSshCommandSpy).toHaveBeenCalled();
			});

			it('should default to SSH protocol when protocol is not specified', async () => {
				// Arrange
				const { execSync } = require('child_process');
				execSync.mockReturnValueOnce('git version 2.40.0').mockReturnValueOnce('OpenSSH_8.0');

				const preferences: SourceControlPreferences = {
					// No protocol specified - should default to SSH
					repositoryUrl: 'git@github.com:user/repo.git',
					branchName: 'main',
					connected: true,
					branchReadOnly: false,
					branchColor: '#000000',
					initRepo: false,
				};

				const options = {
					sourceControlPreferences: preferences,
					gitFolder: '/test/git',
					sshFolder: '/test/ssh',
					sshKeyName: 'key',
				};

				(mockPreferencesService.getPrivateKeyPath as jest.Mock).mockResolvedValue(
					'/test/ssh/private_key',
				);

				// Mock setGitSshCommand to set up git instance properly
				const setGitSshCommandSpy = jest
					.spyOn(gitService, 'setGitSshCommand')
					.mockImplementation(async () => {
						gitService.git = mockGitInstance as any;
					});

				// Mock repository and remote checks
				mockGitInstance.checkIsRepo.mockResolvedValueOnce(true);
				mockGitInstance.getRemotes.mockResolvedValueOnce([
					{
						name: 'origin',
						refs: {
							push: preferences.repositoryUrl,
							fetch: preferences.repositoryUrl,
						},
					},
				]);

				// Act
				await gitService.initService(options);

				// Assert
				expect(execSync).toHaveBeenCalledWith('ssh -V', expect.any(Object));
				expect(setGitSshCommandSpy).toHaveBeenCalled();
			});

			it('should throw error for unsupported protocols', async () => {
				// Arrange
				const { execSync } = require('child_process');
				execSync.mockReturnValue('git version 2.40.0');

				const preferences = {
					protocol: 'ftp' as any, // Invalid protocol
					repositoryUrl: 'ftp://example.com/repo.git',
					branchName: 'main',
					connected: true,
					branchReadOnly: false,
					branchColor: '#000000',
				};

				const options = {
					sourceControlPreferences: preferences,
					gitFolder: '/test/git',
					sshFolder: '/test/ssh',
					sshKeyName: 'key',
				};

				// Act & Assert
				await expect(gitService.initService(options)).rejects.toThrow(UnexpectedError);
				await expect(gitService.initService(options)).rejects.toThrow('Unsupported protocol: ftp');
			});
		});

		describe('Git Operations with HTTPS Authentication', () => {
			let mockPrefs: SourceControlPreferences;

			beforeEach(async () => {
				mockPrefs = {
					protocol: 'https',
					username: 'testuser',
					personalAccessToken: 'ghp_test123',
					repositoryUrl: 'https://github.com/user/repo.git',
					branchName: 'main',
					connected: true,
					branchReadOnly: false,
					branchColor: '#000000',
				};

				(mockPreferencesService.getPreferences as jest.Mock).mockReturnValue(mockPrefs);
				(mockPreferencesService as any).gitFolder = '/test/git';

				// Set up the git instance
				await gitService.setGitHttpsAuth('/test/git', 'testuser', 'ghp_test123');
			});

			describe('fetch', () => {
				it('should re-authenticate before fetching', async () => {
					// Arrange
					jest.spyOn(gitService, 'setGitHttpsAuth').mockResolvedValue();

					// Act
					await gitService.fetch();

					// Assert
					expect(gitService.setGitHttpsAuth).toHaveBeenCalledWith(
						'/test/git',
						'testuser',
						'ghp_test123',
					);
					expect(mockGitInstance.fetch).toHaveBeenCalled();
				});

				it('should handle authentication failures during fetch', async () => {
					// Arrange
					const authError = new Error('Authentication failed: Invalid credentials');
					jest.spyOn(gitService, 'setGitHttpsAuth').mockRejectedValue(authError);

					// Act & Assert
					await expect(gitService.fetch()).rejects.toThrow(UnexpectedError);
					await expect(gitService.fetch()).rejects.toThrow('Failed to authenticate Git');
				});
			});

			describe('pull', () => {
				it('should re-authenticate before pulling', async () => {
					// Arrange
					jest.spyOn(gitService, 'setGitHttpsAuth').mockResolvedValue();

					// Act
					await gitService.pull();

					// Assert
					expect(gitService.setGitHttpsAuth).toHaveBeenCalledWith(
						'/test/git',
						'testuser',
						'ghp_test123',
					);
					expect(mockGitInstance.pull).toHaveBeenCalledWith('origin', undefined, ['--ff-only']);
				});

				it('should pull without fast-forward only when specified', async () => {
					// Arrange
					jest.spyOn(gitService, 'setGitHttpsAuth').mockResolvedValue();

					// Act
					await gitService.pull({ ffOnly: false });

					// Assert
					expect(mockGitInstance.pull).toHaveBeenCalledWith('origin', undefined, []);
				});
			});

			describe('push', () => {
				it('should re-authenticate before pushing', async () => {
					// Arrange
					jest.spyOn(gitService, 'setGitHttpsAuth').mockResolvedValue();

					// Act
					await gitService.push();

					// Assert
					expect(gitService.setGitHttpsAuth).toHaveBeenCalledWith(
						'/test/git',
						'testuser',
						'ghp_test123',
					);
					expect(mockGitInstance.push).toHaveBeenCalledWith('origin', 'main');
				});

				it('should push with force flag when specified', async () => {
					// Arrange
					jest.spyOn(gitService, 'setGitHttpsAuth').mockResolvedValue();

					// Act
					await gitService.push({ force: true, branch: 'feature' });

					// Assert
					expect(mockGitInstance.push).toHaveBeenCalledWith('origin', 'feature', ['-f']);
				});
			});
		});

		describe('Security and Error Handling', () => {
			describe('credential sanitization', () => {
				it('should sanitize URLs in error messages', async () => {
					// Arrange
					const repoUrlWithCreds = 'https://user:token@github.com/user/repo.git';
					const mockError = new Error(`Authentication failed for ${repoUrlWithCreds}`);

					(mockPreferencesService.getPreferences as jest.Mock).mockReturnValue({
						protocol: 'https',
						username: 'testuser',
						personalAccessToken: 'ghp_test123',
					} as SourceControlPreferences);

					// Set up git first to pass the initialization check
					await gitService.setGitHttpsAuth('/test/git', 'testuser', 'ghp_test123');

					jest.spyOn(gitService, 'setGitHttpsAuth').mockRejectedValue(mockError);

					// Act & Assert
					await expect(gitService.fetch()).rejects.toThrow('Failed to authenticate Git');

					// Verify that the original error message was sanitized
					try {
						await gitService.fetch();
					} catch (thrownError: any) {
						expect(thrownError.cause.message).toContain('[CREDENTIALS]@github.com');
						expect(thrownError.cause.message).not.toContain('user:token');
					}
				});

				it('should sanitize repository URLs in logs during hasRemote check', async () => {
					// Arrange
					const repoUrlWithCreds = 'https://user:token@github.com/user/repo.git';

					// Set up git first
					await gitService.setGitHttpsAuth('/test/git', 'testuser', 'ghp_test123');

					mockGitInstance.getRemotes.mockResolvedValue([
						{
							name: 'origin',
							refs: {
								fetch: repoUrlWithCreds,
								push: repoUrlWithCreds,
							},
						},
					]);

					// Act
					const result = await (gitService as any).hasRemote(repoUrlWithCreds);

					// Assert - This is more about ensuring the method handles sanitization internally
					// The actual log assertion would require spy on logger, but we verify no error is thrown
					expect(result).toBe(true);
					expect(mockGitInstance.getRemotes).toHaveBeenCalled();
				});
			});

			describe('authentication failures', () => {
				it('should handle missing credentials in reAuthenticate', async () => {
					// Arrange
					// Set up git first
					await gitService.setGitHttpsAuth('/test/git', 'testuser', 'ghp_test123');

					(mockPreferencesService.getPreferences as jest.Mock).mockReturnValue({
						protocol: 'https',
						// Missing username and personalAccessToken
					} as SourceControlPreferences);

					// Act & Assert
					await expect(gitService.fetch()).rejects.toThrow(UnexpectedError);
					await expect(gitService.fetch()).rejects.toThrow('Failed to authenticate Git');
				});

				it('should handle invalid credentials gracefully', async () => {
					// Arrange
					const invalidCredsError = new Error('HTTP 401: Bad credentials');

					// Set up git first
					await gitService.setGitHttpsAuth('/test/git', 'testuser', 'invalid_token');

					(mockPreferencesService.getPreferences as jest.Mock).mockReturnValue({
						protocol: 'https',
						username: 'testuser',
						personalAccessToken: 'invalid_token',
					} as SourceControlPreferences);

					// Mock fetch to fail after re-authentication
					mockGitInstance.fetch.mockRejectedValueOnce(invalidCredsError);

					// Act & Assert
					await expect(gitService.fetch()).rejects.toThrow('HTTP 401: Bad credentials');
				});
			});
		});

		describe('Protocol Switching', () => {
			it('should switch from SSH to HTTPS correctly', async () => {
				// Arrange
				const { execSync } = require('child_process');
				execSync.mockReturnValueOnce('git version 2.40.0').mockReturnValueOnce('OpenSSH_8.0');

				// First initialize with SSH
				const sshPreferences: SourceControlPreferences = {
					protocol: 'ssh',
					repositoryUrl: 'git@github.com:user/repo.git',
					branchName: 'main',
					connected: true,
					branchReadOnly: false,
					branchColor: '#000000',
					initRepo: false,
				};

				(mockPreferencesService.getPrivateKeyPath as jest.Mock).mockResolvedValue(
					'/test/ssh/private_key',
				);
				const setGitSshCommandSpy = jest
					.spyOn(gitService, 'setGitSshCommand')
					.mockImplementation(async () => {
						gitService.git = mockGitInstance as any;
					});

				// Mock repository and remote checks
				mockGitInstance.checkIsRepo.mockResolvedValue(true);
				mockGitInstance.getRemotes.mockResolvedValue([
					{
						name: 'origin',
						refs: {
							push: sshPreferences.repositoryUrl,
							fetch: sshPreferences.repositoryUrl,
						},
					},
				]);

				await gitService.initService({
					sourceControlPreferences: sshPreferences,
					gitFolder: '/test/git',
					sshFolder: '/test/ssh',
					sshKeyName: 'key',
				});

				// Reset git service to allow re-initialization
				gitService.resetService();

				execSync.mockReturnValue('git version 2.40.0');

				// Then switch to HTTPS
				const httpsPreferences: SourceControlPreferences = {
					protocol: 'https',
					username: 'testuser',
					personalAccessToken: 'ghp_test123',
					repositoryUrl: 'https://github.com/user/repo.git',
					branchName: 'main',
					connected: true,
					branchReadOnly: false,
					branchColor: '#000000',
					initRepo: false,
				};

				// Mock repository and remote checks for HTTPS
				mockGitInstance.getRemotes.mockResolvedValue([
					{
						name: 'origin',
						refs: {
							push: httpsPreferences.repositoryUrl,
							fetch: httpsPreferences.repositoryUrl,
						},
					},
				]);

				// Act
				await gitService.initService({
					sourceControlPreferences: httpsPreferences,
					gitFolder: '/test/git',
					sshFolder: '/test/ssh',
					sshKeyName: 'key',
				});

				// Assert
				expect(setGitSshCommandSpy).toHaveBeenCalled();
				expect(mockGitInstance.env).toHaveBeenCalledWith('GIT_USERNAME', 'testuser');
				expect(mockGitInstance.env).toHaveBeenCalledWith('GIT_PASSWORD', 'ghp_test123');
			});

			it('should switch from HTTPS to SSH correctly', async () => {
				// Arrange
				const { execSync } = require('child_process');
				execSync.mockReturnValue('git version 2.40.0');

				// First initialize with HTTPS - but don't connect to avoid initRepository
				const httpsPreferences: SourceControlPreferences = {
					protocol: 'https',
					username: 'testuser',
					personalAccessToken: 'ghp_test123',
					repositoryUrl: 'https://github.com/user/repo.git',
					branchName: 'main',
					connected: false, // Don't connect to avoid complex initialization
					branchReadOnly: false,
					branchColor: '#000000',
					initRepo: false,
				};

				// Mock repository and remote checks
				mockGitInstance.checkIsRepo.mockResolvedValue(true);

				await gitService.initService({
					sourceControlPreferences: httpsPreferences,
					gitFolder: '/test/git',
					sshFolder: '/test/ssh',
					sshKeyName: 'key',
				});

				// Reset git service to allow re-initialization
				gitService.resetService();

				execSync.mockReturnValueOnce('git version 2.40.0').mockReturnValueOnce('OpenSSH_8.0');

				// Then switch to SSH
				const sshPreferences: SourceControlPreferences = {
					protocol: 'ssh',
					repositoryUrl: 'git@github.com:user/repo.git',
					branchName: 'main',
					connected: false, // Don't connect to avoid complex initialization
					branchReadOnly: false,
					branchColor: '#000000',
					initRepo: false,
				};

				(mockPreferencesService.getPrivateKeyPath as jest.Mock).mockResolvedValue(
					'/test/ssh/private_key',
				);
				const setGitSshCommandSpy = jest
					.spyOn(gitService, 'setGitSshCommand')
					.mockImplementation(async () => {
						gitService.git = mockGitInstance as any;
					});

				// Act
				await gitService.initService({
					sourceControlPreferences: sshPreferences,
					gitFolder: '/test/git',
					sshFolder: '/test/ssh',
					sshKeyName: 'key',
				});

				// Assert
				expect(setGitSshCommandSpy).toHaveBeenCalled();
			});
		});

		describe('Security Cleanup', () => {
			beforeEach(() => {
				jest.clearAllMocks();
			});

			describe('Temporary File Tracking', () => {
				it('should track SSH key temporary files for cleanup', async () => {
					// Arrange
					const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);
					const mockPrivateKeyPath = '/test/temp/ssh_private_key_temp';
					(mockPreferencesService.getPrivateKeyPath as jest.Mock).mockResolvedValue(
						mockPrivateKeyPath,
					);

					// Mock the trackTempFile method to verify it's called
					const trackTempFileSpy = jest.spyOn(gitService as any, 'trackTempFile');

					// Act
					await gitService.setGitSshCommand('/test/git', '/test/ssh');

					// Assert
					expect(trackTempFileSpy).toHaveBeenCalledWith(mockPrivateKeyPath);
				});
			});

			describe('Sensitive Environment Variable Tracking', () => {
				it('should track sensitive environment variables for SSH authentication', async () => {
					// Arrange
					const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);
					(mockPreferencesService.getPrivateKeyPath as jest.Mock).mockResolvedValue(
						'/test/temp/ssh_private_key_temp',
					);

					const trackSensitiveEnvVarSpy = jest.spyOn(gitService as any, 'trackSensitiveEnvVar');

					// Act
					await gitService.setGitSshCommand('/test/git', '/test/ssh');

					// Assert
					expect(trackSensitiveEnvVarSpy).toHaveBeenCalledWith('GIT_SSH_COMMAND');
					expect(trackSensitiveEnvVarSpy).toHaveBeenCalledWith('GIT_TERMINAL_PROMPT');
				});

				it('should track sensitive environment variables for HTTPS authentication', async () => {
					// Arrange
					const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);
					const trackSensitiveEnvVarSpy = jest.spyOn(gitService as any, 'trackSensitiveEnvVar');

					// Act
					await gitService.setGitHttpsAuth('/test/git', 'testuser', 'testtoken');

					// Assert
					expect(trackSensitiveEnvVarSpy).toHaveBeenCalledWith('GIT_TERMINAL_PROMPT');
					expect(trackSensitiveEnvVarSpy).toHaveBeenCalledWith('GIT_ASKPASS');
					expect(trackSensitiveEnvVarSpy).toHaveBeenCalledWith('GIT_USERNAME');
					expect(trackSensitiveEnvVarSpy).toHaveBeenCalledWith('GIT_PASSWORD');
				});
			});

			describe('Cleanup Method', () => {
				it('should cleanup temporary files and sensitive data', async () => {
					// Arrange
					const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);

					// Mock fs.rm
					const mockFsRm = jest.fn().mockResolvedValue(undefined);
					jest.doMock('fs/promises', () => ({ rm: mockFsRm }));

					// Add some temporary files and sensitive env vars
					(gitService as any).tempFiles.add('/test/temp/file1');
					(gitService as any).tempFiles.add('/test/temp/file2');
					(gitService as any).sensitiveEnvVars.add('GIT_USERNAME');
					(gitService as any).sensitiveEnvVars.add('GIT_PASSWORD');

					// Set some environment variables
					process.env.GIT_USERNAME = 'testuser';
					process.env.GIT_PASSWORD = 'testpass';

					// Act
					await gitService.cleanup();

					// Assert
					expect((gitService as any).tempFiles.size).toBe(0);
					expect((gitService as any).sensitiveEnvVars.size).toBe(0);
					expect(process.env.GIT_USERNAME).toBeUndefined();
					expect(process.env.GIT_PASSWORD).toBeUndefined();
					expect(gitService.git).toBeNull();
				});
			});

			describe('Remote Operation Security', () => {
				beforeEach(async () => {
					// Initialize git service
					const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);
					gitService.git = mockGitInstance as any;

					// Mock clearSensitiveData
					jest.spyOn(gitService as any, 'clearSensitiveData').mockImplementation(() => {});
					jest.spyOn(gitService as any, 'reAuthenticate').mockResolvedValue(undefined);
				});

				it('should clear sensitive data after fetch operation', async () => {
					// Arrange
					const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);
					gitService.git = mockGitInstance as any;

					const clearSensitiveDataSpy = jest
						.spyOn(gitService as any, 'clearSensitiveData')
						.mockImplementation(() => {});
					jest.spyOn(gitService as any, 'reAuthenticate').mockResolvedValue(undefined);

					// Act
					await gitService.fetch();

					// Assert
					expect(clearSensitiveDataSpy).toHaveBeenCalled();
				});

				it('should clear sensitive data after pull operation', async () => {
					// Arrange
					const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);
					gitService.git = mockGitInstance as any;

					const clearSensitiveDataSpy = jest
						.spyOn(gitService as any, 'clearSensitiveData')
						.mockImplementation(() => {});
					jest.spyOn(gitService as any, 'reAuthenticate').mockResolvedValue(undefined);

					// Act
					await gitService.pull();

					// Assert
					expect(clearSensitiveDataSpy).toHaveBeenCalled();
				});

				it('should clear sensitive data after push operation', async () => {
					// Arrange
					const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);
					gitService.git = mockGitInstance as any;

					const clearSensitiveDataSpy = jest
						.spyOn(gitService as any, 'clearSensitiveData')
						.mockImplementation(() => {});
					jest.spyOn(gitService as any, 'reAuthenticate').mockResolvedValue(undefined);

					// Act
					await gitService.push({ force: false, branch: 'main' });

					// Assert
					expect(clearSensitiveDataSpy).toHaveBeenCalled();
				});

				it('should clear sensitive data even when operations throw errors', async () => {
					// Arrange
					const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);
					const mockFailingGitInstance = {
						...mockGitInstance,
						fetch: jest.fn().mockRejectedValue(new Error('Network error')),
					};
					gitService.git = mockFailingGitInstance as any;

					const clearSensitiveDataSpy = jest
						.spyOn(gitService as any, 'clearSensitiveData')
						.mockImplementation(() => {});
					jest.spyOn(gitService as any, 'reAuthenticate').mockResolvedValue(undefined);

					// Act & Assert
					await expect(gitService.fetch()).rejects.toThrow('Network error');
					expect(clearSensitiveDataSpy).toHaveBeenCalled();
				});
			});
		});
	});
});
