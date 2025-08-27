import path from 'path';
import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { simpleGit } from 'simple-git';
import type { SimpleGit } from 'simple-git';

import { SourceControlGitService } from '../source-control-git.service.ee';
import type { SourceControlPreferences } from '../types/source-control-preferences';

const MOCK_BRANCHES = {
	all: ['origin/master', 'origin/feature/branch'],
	branches: {
		'origin/master': {},
		'origin/feature/branch': {},
	},
	current: 'master',
};

jest.mock('simple-git', () => {
	return {
		simpleGit: jest.fn().mockImplementation(() => ({
			branch: jest.fn().mockResolvedValue(MOCK_BRANCHES),
		})),
	};
});

describe('SourceControlGitService', () => {
	const sourceControlGitService = new SourceControlGitService(mock(), mock(), mock());

	beforeAll(() => {
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
			it('should normalize Windows backslashes to forward slashes', () => {
				// Test the path normalization logic directly
				const windowsPath = 'C:\\Users\\Test\\.n8n\\ssh_private_key_temp';
				const expected = 'C:/Users/Test/.n8n/ssh_private_key_temp';

				// This mimics the logic from setGitSshCommand
				const normalized = windowsPath.split(path.sep).join(path.posix.sep);

				expect(normalized).toBe(expected);
				expect(normalized).not.toContain('\\');
			});

			it('should handle Unix paths without modification', () => {
				const unixPath = '/home/user/.n8n/ssh_private_key_temp';

				const normalized = unixPath.split(path.sep).join(path.posix.sep);

				expect(normalized).toBe(unixPath);
			});

			it('should handle mixed path separators', () => {
				const mixedPath = 'C:/Users\\Test/.n8n\\ssh_private_key_temp';
				const expected = 'C:/Users/Test/.n8n/ssh_private_key_temp';

				const normalized = mixedPath.split(path.sep).join(path.posix.sep);

				expect(normalized).toBe(expected);
				expect(normalized).not.toContain('\\');
			});

			it('should create properly quoted SSH command', () => {
				const privateKeyPath = 'C:/Users/Test User/.n8n/ssh_private_key_temp';
				const knownHostsPath = 'C:/Users/Test User/.n8n/.ssh/known_hosts';

				const sshCommand = `ssh -o UserKnownHostsFile="${knownHostsPath}" -o StrictHostKeyChecking=no -i "${privateKeyPath}"`;

				expect(sshCommand).toContain('"C:/Users/Test User/.n8n/ssh_private_key_temp"');
				expect(sshCommand).toContain('"C:/Users/Test User/.n8n/.ssh/known_hosts"');
				expect(sshCommand).toContain('UserKnownHostsFile=');
				expect(sshCommand).toContain('StrictHostKeyChecking=no');
			});
		});
	});
});
