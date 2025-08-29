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
				const gitService = new SourceControlGitService(mock(), mock(), mock());
				const prefs = mock<SourceControlPreferences>({ branchName: 'main' });
				const user = mock<User>();
				const git = mock<SimpleGit>();
				const checkoutSpy = jest.spyOn(git, 'checkout');
				const branchSpy = jest.spyOn(git, 'branch');
				gitService.git = git;
				jest.spyOn(gitService, 'setGitSshCommand').mockResolvedValue();
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
				mockPreferencesService.getPrivateKeyPath.mockResolvedValue(privateKeyPath);

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
				mockPreferencesService.getPrivateKeyPath.mockResolvedValue(pathWithQuotes);

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
});
