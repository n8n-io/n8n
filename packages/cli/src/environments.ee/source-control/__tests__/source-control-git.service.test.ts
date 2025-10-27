import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { simpleGit } from 'simple-git';
import type { SimpleGit } from 'simple-git';

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
};

jest.mock('simple-git', () => {
	return {
		simpleGit: jest.fn().mockImplementation(() => mockGitInstance),
	};
});

describe('SourceControlGitService', () => {
	const mockSourceControlPreferencesService = mock<SourceControlPreferencesService>();
	const sourceControlGitService = new SourceControlGitService(
		mock(),
		mock(),
		mockSourceControlPreferencesService,
	);

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
				const gitService = new SourceControlGitService(mock(), mock(), mock());
				const prefs = mock<SourceControlPreferences>({ branchName: 'main' });
				const user = mock<User>();
				const git = mock<SimpleGit>();
				const checkoutSpy = jest.spyOn(git, 'checkout');
				const branchSpy = jest.spyOn(git, 'branch');
				gitService.git = git;
				jest.spyOn(gitService, 'setGitCommand').mockResolvedValue();
				jest
					.spyOn(gitService, 'getBranches')
					.mockResolvedValue({ currentBranch: '', branches: ['main'] });

				/**
				 * Act
				 */
				await gitService.initRepository(prefs, user);

				/**
				 * Assert
				 */
				expect(checkoutSpy).toHaveBeenCalledWith('main');
				expect(branchSpy).toHaveBeenCalledWith(['--set-upstream-to=origin/main', 'main']);
			});
		});

		describe('repository URL authorization', () => {
			it('should set repositoryUrl URL for SSH connection type', async () => {
				const mockPreferencesService = mock<SourceControlPreferencesService>();
				const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);
				const originUrl = 'git@github.com:user/repo.git';
				const prefs = mock<SourceControlPreferences>({
					repositoryUrl: originUrl,
					connectionType: 'ssh',
					branchName: 'main',
				});
				const user = mock<User>();
				const git = mock<SimpleGit>();
				const addRemoteSpy = jest.spyOn(git, 'addRemote');
				jest.spyOn(gitService, 'setGitUserDetails').mockResolvedValue();
				// Mock getBranches and fetch to avoid remote tracking logic
				jest
					.spyOn(gitService, 'getBranches')
					.mockResolvedValue({ currentBranch: 'main', branches: [] });
				jest.spyOn(gitService, 'fetch').mockResolvedValue({} as any);
				gitService.git = git;

				await gitService.initRepository(prefs, user);

				expect(addRemoteSpy).toHaveBeenCalledWith('origin', originUrl);
				expect(mockPreferencesService.getDecryptedHttpsCredentials).not.toHaveBeenCalled();
			});

			it('should set repositoryUrl URL for HTTPS connection type', async () => {
				const mockPreferencesService = mock<SourceControlPreferencesService>();
				const credentials = { username: 'testuser', password: 'test:pass#word' };
				mockPreferencesService.getDecryptedHttpsCredentials.mockResolvedValue(credentials);

				const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);
				const originUrl = 'https://github.com/user/repo.git';
				const prefs = mock<SourceControlPreferences>({
					repositoryUrl: originUrl,
					connectionType: 'https',
					branchName: 'main',
				});
				const user = mock<User>();
				const git = mock<SimpleGit>();
				const addRemoteSpy = jest.spyOn(git, 'addRemote');
				jest.spyOn(gitService, 'setGitUserDetails').mockResolvedValue();
				// Mock getBranches and fetch to avoid remote tracking logic
				jest
					.spyOn(gitService, 'getBranches')
					.mockResolvedValue({ currentBranch: 'main', branches: [] });
				jest.spyOn(gitService, 'fetch').mockResolvedValue({} as any);
				gitService.git = git;

				await gitService.initRepository(prefs, user);

				expect(addRemoteSpy).toHaveBeenCalledWith('origin', originUrl);
			});

			it('should throw error when HTTPS connection type is specified but no credentials found', async () => {
				const mockPreferencesService = mock<SourceControlPreferencesService>();
				const errorMessage = 'Error';
				mockPreferencesService.getDecryptedHttpsCredentials.mockRejectedValue(
					new Error(errorMessage),
				);
				mockPreferencesService.getPreferences.mockReturnValue({
					connectionType: 'https',
					repositoryUrl: 'https://github.com/user/repo.git',
				} as never);

				const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);
				const prefs = mock<SourceControlPreferences>({
					repositoryUrl: 'https://github.com/user/repo.git',
					connectionType: 'https',
					branchName: 'main',
				});
				const user = mock<User>();
				const git = mock<SimpleGit>();
				gitService.git = git;

				await expect(gitService.initRepository(prefs, user)).rejects.toThrow(errorMessage);
				expect(mockPreferencesService.getDecryptedHttpsCredentials).toHaveBeenCalled();
			});
		});
	});

	describe('setGitCommand', () => {
		it('should setup git client for https connection', async () => {
			const credentials = { username: 'testuser', password: 'testpass' };
			mockSourceControlPreferencesService.getPreferences.mockReturnValue({
				connectionType: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
			} as never);
			mockSourceControlPreferencesService.getDecryptedHttpsCredentials.mockResolvedValue(
				credentials,
			);

			// Clear previous calls to simpleGit
			(simpleGit as jest.Mock).mockClear();

			await sourceControlGitService.setGitCommand();

			expect(mockGitInstance.env).toHaveBeenCalledWith('GIT_TERMINAL_PROMPT', '0');
			const expectedCredentialScript = `!f() { echo username='${credentials.username}'; echo password='${credentials.password}'; }; f`;
			expect(simpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					binary: 'git',
					maxConcurrentProcesses: 6,
					trimmed: false,
					config: [`credential.helper=${expectedCredentialScript}`, 'credential.useHttpPath=true'],
				}),
			);
		});

		it('should escape https credentials to prevent command injection', async () => {
			// simulate credentials that would try to inject an rm -rf command by breaking out of the echo command with single quotes inside them
			const credentials = { username: "user'; rm -rf /", password: "pass'; rm -rf /" };

			mockSourceControlPreferencesService.getPreferences.mockReturnValue({
				connectionType: 'https',
				repositoryUrl: 'https://github.com/user/repo.git',
			} as never);
			mockSourceControlPreferencesService.getDecryptedHttpsCredentials.mockResolvedValue(
				credentials,
			);
			// Clear previous calls to simpleGit
			(simpleGit as jest.Mock).mockClear();

			await sourceControlGitService.setGitCommand();

			expect(mockGitInstance.env).toHaveBeenCalledWith('GIT_TERMINAL_PROMPT', '0');
			const expectedCredentialScript =
				"!f() { echo username='user'\"'\"'; rm -rf /'; echo password='pass'\"'\"'; rm -rf /'; }; f";
			expect(simpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: [`credential.helper=${expectedCredentialScript}`, 'credential.useHttpPath=true'],
				}),
			);
		});

		it('should setup git client for ssh connection', async () => {
			// @ts-expect-error required for testing
			mockSourceControlPreferencesService['sshFolder'] = '.ssh';
			mockSourceControlPreferencesService.getPrivateKeyPath.mockResolvedValue('private-key');
			mockSourceControlPreferencesService.getPreferences.mockReturnValue({
				connectionType: 'ssh',
			} as never);

			await sourceControlGitService.setGitCommand();

			expect(mockGitInstance.env).toHaveBeenCalledWith(
				'GIT_SSH_COMMAND',
				'ssh -o UserKnownHostsFile=".ssh/known_hosts" -o StrictHostKeyChecking=no -i "private-key"',
			);
			expect(mockGitInstance.env).toHaveBeenCalledWith('GIT_TERMINAL_PROMPT', '0');
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
				mockPreferencesService.getPrivateKeyPath.mockResolvedValue(windowsPath);
				// Mock getPreferences to return SSH connection type (required for new functionality)
				mockPreferencesService.getPreferences.mockReturnValue({
					connectionType: 'ssh',
					connected: true,
					repositoryUrl: 'git@github.com:user/repo.git',
					branchName: 'main',
					branchReadOnly: false,
					branchColor: '#5296D6',
					initRepo: false,
					keyGeneratorType: 'ed25519',
				});

				const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);

				// Act
				await gitService.setGitCommand('/git/folder', sshFolder);

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
				mockPreferencesService.getPrivateKeyPath.mockResolvedValue(privateKeyPath);
				// Mock getPreferences to return SSH connection type
				mockPreferencesService.getPreferences.mockReturnValue({
					connectionType: 'ssh',
					connected: true,
					repositoryUrl: 'git@github.com:user/repo.git',
					branchName: 'main',
					branchReadOnly: false,
					branchColor: '#5296D6',
					initRepo: false,
					keyGeneratorType: 'ed25519',
				});

				const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);

				// Act
				await gitService.setGitCommand('/git/folder', sshFolder);

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
				mockPreferencesService.getPrivateKeyPath.mockResolvedValue(pathWithQuotes);
				// Mock getPreferences to return SSH connection type
				mockPreferencesService.getPreferences.mockReturnValue({
					connectionType: 'ssh',
					connected: true,
					repositoryUrl: 'git@github.com:user/repo.git',
					branchName: 'main',
					branchReadOnly: false,
					branchColor: '#5296D6',
					initRepo: false,
					keyGeneratorType: 'ed25519',
				});

				const gitService = new SourceControlGitService(mock(), mock(), mockPreferencesService);

				// Act
				await gitService.setGitCommand('/git/folder', sshFolder);

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
});
