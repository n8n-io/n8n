import type { User } from '@n8n/db';
import { mock } from 'jest-mock-extended';
import { simpleGit } from 'simple-git';
import type { SimpleGit } from 'simple-git';

import { SOURCE_CONTROL_MANAGED_DIRECTORIES, SOURCE_CONTROL_MANAGED_PATHS } from '../constants';
import { SourceControlGitService } from '../source-control-git.service.ee';
import type { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import type { SourceControlPreferences } from '../types/source-control-preferences';

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
	fetch: jest.fn().mockResolvedValue(undefined),
	raw: jest.fn().mockResolvedValue(''),
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

	const createSynchronizationService = (
		outputs: { shape?: string; contents?: string },
		logger = mock<ConstructorParameters<typeof SourceControlGitService>[0]>(),
	) => {
		const gitService = new SourceControlGitService(logger, mock(), mock());
		const git = mock<SimpleGit>();
		git.branch.mockResolvedValue(MOCK_BRANCHES as never);
		git.raw
			.mockResolvedValueOnce('abc123\n')
			.mockResolvedValueOnce(outputs.shape ?? '')
			.mockResolvedValueOnce(outputs.contents ?? '')
			.mockResolvedValue('updated');
		git.merge.mockResolvedValue(mock());
		gitService.git = git;
		jest.spyOn(gitService, 'fetch').mockResolvedValue(mock());
		return { gitService, git };
	};

	describe('managed tree validation', () => {
		it.each(['100644', '100755'])('should accept a regular file with mode %s', async (mode) => {
			const { gitService, git } = createSynchronizationService({
				shape: '040000 tree abc123\tworkflows\0',
				contents: `${mode} blob abc123\tworkflows/example.json\0`,
			});

			await expect(gitService.pull()).resolves.toBeDefined();
			expect(git.raw).toHaveBeenNthCalledWith(2, [
				'ls-tree',
				'-z',
				'--full-tree',
				'abc123',
				'--',
				...SOURCE_CONTROL_MANAGED_PATHS,
			]);
			expect(git.raw).toHaveBeenNthCalledWith(3, [
				'ls-tree',
				'-r',
				'-z',
				'--full-tree',
				'abc123',
				'--',
				...SOURCE_CONTROL_MANAGED_DIRECTORIES,
			]);
		});

		it.each([
			{
				outputs: { shape: '120000 blob abc123\ttags.json\0' },
				reason: 'Git file mode 120000 is not supported',
				rawCalls: 2,
			},
			{
				outputs: { shape: '040000 tree abc123\ttags.json\0' },
				reason: 'Git object type tree is not supported',
				rawCalls: 2,
			},
			{
				outputs: { shape: '100644 blob abc123\tworkflows\0' },
				reason: 'Managed path workflows must be a directory',
				rawCalls: 2,
			},
			{
				outputs: {
					shape: '040000 tree abc123\tprojects\0',
					contents: '160000 commit abc123\tprojects/module\0',
				},
				reason: 'Git object type commit is not supported',
				rawCalls: 3,
			},
			{
				outputs: {
					shape: '040000 tree abc123\tworkflows\0',
					contents: '100664 blob abc123\tworkflows/example.json\0',
				},
				reason: 'Git file mode 100664 is not supported',
				rawCalls: 3,
			},
		])(
			'should reject an unsupported managed entry ($reason)',
			async ({ outputs, reason, rawCalls }) => {
				const logger = mock<ConstructorParameters<typeof SourceControlGitService>[0]>();
				const { gitService, git } = createSynchronizationService(outputs, logger);

				await expect(gitService.pull()).rejects.toThrow(
					'The remote repository contains an unsupported source control entry. Update the repository and try again.',
				);
				expect(git.raw).toHaveBeenCalledTimes(rawCalls);
				expect(git.merge).not.toHaveBeenCalled();
				expect(logger.error).toHaveBeenCalledWith(
					'Remote source control tree contains an unsupported managed entry',
					{
						filePath: expect.any(String),
						reason,
					},
				);
			},
		);

		it('should parse managed paths that contain whitespace', async () => {
			const { gitService } = createSynchronizationService({
				shape: '040000 tree abc123\tworkflows\0' + '040000 tree def456\tprojects\0',
				contents:
					'100644 blob abc123\tworkflows/space tab\tline\nbreak.json\0' +
					'100755 blob def456\tprojects/project name.json\0',
			});

			await expect(gitService.pull()).resolves.toBeDefined();
		});

		it('should ignore entries outside managed paths', async () => {
			const { gitService, git } = createSynchronizationService({});

			await expect(gitService.pull()).resolves.toBeDefined();
			expect(git.raw).toHaveBeenNthCalledWith(2, expect.not.arrayContaining(['docs']));
			expect(git.raw).toHaveBeenNthCalledWith(3, expect.not.arrayContaining(['docs']));
		});
	});

	describe('remote updates', () => {
		it('should validate before merging the current branch', async () => {
			const { gitService, git } = createSynchronizationService({
				shape: '100644 blob abc123\ttags.json\0',
			});

			await gitService.pull();

			expect(git.raw).toHaveBeenNthCalledWith(1, [
				'rev-parse',
				'--verify',
				'refs/remotes/origin/master^{commit}',
			]);
			expect(git.raw).toHaveBeenCalledTimes(3);
			expect(git.merge).toHaveBeenCalledWith(['--ff-only', 'abc123']);
		});

		it('should validate before checking out a branch', async () => {
			const { gitService, git } = createSynchronizationService({
				shape: '100644 blob abc123\ttags.json\0',
			});

			await gitService.setBranch('main');

			expect(git.raw).toHaveBeenNthCalledWith(4, ['checkout', '-B', 'main', 'abc123']);
			expect(git.branch).toHaveBeenCalledWith(['--set-upstream-to=origin/main', 'main']);
		});

		it('should not check out a branch when validation fails', async () => {
			const { gitService, git } = createSynchronizationService({
				shape: '120000 blob abc123\ttags.json\0',
			});

			await expect(gitService.setBranch('main')).rejects.toThrow(
				'The remote repository contains an unsupported source control entry.',
			);
			expect(git.raw).toHaveBeenCalledTimes(2);
			expect(git.branch).not.toHaveBeenCalled();
		});

		it('should validate before resetting to a remote branch', async () => {
			const { gitService, git } = createSynchronizationService({
				shape: '100644 blob abc123\ttags.json\0',
			});

			await gitService.resetBranch({ hard: true, target: 'origin/main' });

			expect(git.raw).toHaveBeenNthCalledWith(4, ['reset', '--hard', 'abc123']);
		});

		it('should preserve local hard and soft reset behavior', async () => {
			const gitService = new SourceControlGitService(mock(), mock(), mock());
			const git = mock<SimpleGit>();
			git.raw.mockResolvedValue('reset');
			gitService.git = git;
			const fetchSpy = jest.spyOn(gitService, 'fetch');

			await gitService.resetBranch();
			await gitService.resetBranch({ hard: false, target: 'HEAD~1' });

			expect(fetchSpy).not.toHaveBeenCalled();
			expect(git.raw).toHaveBeenNthCalledWith(1, ['reset', '--hard', 'HEAD']);
			expect(git.raw).toHaveBeenNthCalledWith(2, ['reset', 'HEAD~1']);
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
				gitService.git = git;
				jest.spyOn(gitService, 'setGitCommand').mockResolvedValue();
				jest
					.spyOn(gitService, 'getBranches')
					.mockResolvedValue({ currentBranch: '', branches: ['main'] });
				const setBranchSpy = jest.spyOn(gitService, 'setBranch').mockResolvedValue({
					currentBranch: 'main',
					branches: ['main'],
				});

				/**
				 * Act
				 */
				await gitService.initRepository(prefs, user);

				/**
				 * Assert
				 */
				expect(setBranchSpy).toHaveBeenCalledWith('main');
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

	describe('ensureBranchSetup', () => {
		describe('when current branch matches target branch', () => {
			it('should not modify anything', async () => {
				const gitService = new SourceControlGitService(mock(), mock(), mock());
				const git = mock<SimpleGit>();
				git.branch.mockResolvedValue({ current: 'main' } as never);
				gitService.git = git;

				const fetchSpy = jest.spyOn(gitService, 'fetch');
				const checkoutSpy = jest.spyOn(git, 'checkout');

				// Call private method using type assertion
				await (gitService as any).ensureBranchSetup('main');

				expect(fetchSpy).not.toHaveBeenCalled();
				expect(checkoutSpy).not.toHaveBeenCalled();
			});
		});

		describe('when current branch does not match target branch', () => {
			it('should checkout and track the target branch from remote', async () => {
				const gitService = new SourceControlGitService(mock(), mock(), mock());
				const git = mock<SimpleGit>();
				git.branch.mockResolvedValue({ current: 'master' } as never);
				gitService.git = git;

				jest.spyOn(gitService, 'fetch').mockResolvedValue({} as never);
				jest.spyOn(gitService, 'getBranches').mockResolvedValue({
					currentBranch: 'master',
					branches: ['main', 'develop'],
				});
				const setBranchSpy = jest.spyOn(gitService, 'setBranch').mockResolvedValue({
					currentBranch: 'main',
					branches: ['main', 'develop'],
				});

				await (gitService as any).ensureBranchSetup('main');

				expect(setBranchSpy).toHaveBeenCalledWith('main');
			});

			it('should not checkout if target branch does not exist on remote', async () => {
				const gitService = new SourceControlGitService(mock(), mock(), mock());
				const git = mock<SimpleGit>();
				git.branch.mockResolvedValue({ current: 'master' } as never);
				gitService.git = git;

				jest.spyOn(gitService, 'fetch').mockResolvedValue({} as never);
				jest.spyOn(gitService, 'getBranches').mockResolvedValue({
					currentBranch: 'master',
					branches: ['develop', 'feature'],
				});

				await (gitService as any).ensureBranchSetup('main');

				expect(git.checkout).not.toHaveBeenCalled();
			});
		});

		describe('when fetch fails', () => {
			it('should log warning and return without failing', async () => {
				const mockLogger = mock<any>();
				const gitService = new SourceControlGitService(mockLogger, mock(), mock());
				const git = mock<SimpleGit>();
				git.branch.mockResolvedValue({ current: 'master' } as never);
				gitService.git = git;

				const fetchError = new Error('Network error');
				jest.spyOn(gitService, 'fetch').mockRejectedValue(fetchError);

				// Should not throw
				await (gitService as any).ensureBranchSetup('main');

				expect(mockLogger.warn).toHaveBeenCalledWith(
					'Failed to fetch during branch setup recovery',
					{ error: fetchError },
				);
				expect(git.checkout).not.toHaveBeenCalled();
			});
		});

		describe('when checkout fails', () => {
			it('should log warning and not throw', async () => {
				const mockLogger = mock<any>();
				const gitService = new SourceControlGitService(mockLogger, mock(), mock());
				const git = mock<SimpleGit>();
				git.branch.mockResolvedValue({ current: 'master' } as never);
				gitService.git = git;

				jest.spyOn(gitService, 'fetch').mockResolvedValue({} as never);
				jest.spyOn(gitService, 'getBranches').mockResolvedValue({
					currentBranch: 'master',
					branches: ['main'],
				});
				jest.spyOn(gitService, 'setBranch').mockRejectedValue(new Error('Checkout failed'));

				// Should not throw
				await (gitService as any).ensureBranchSetup('main');

				expect(mockLogger.warn).toHaveBeenCalledWith(
					'Failed to checkout branch during recovery',
					expect.objectContaining({ targetBranch: 'main' }),
				);
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
					config: [
						'core.symlinks=false',
						`credential.helper=${expectedCredentialScript}`,
						'credential.useHttpPath=true',
					],
					unsafe: { allowUnsafeCredentialHelper: true },
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
					config: [
						'core.symlinks=false',
						`credential.helper=${expectedCredentialScript}`,
						'credential.useHttpPath=true',
					],
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
			(simpleGit as jest.Mock).mockClear();

			await sourceControlGitService.setGitCommand();

			expect(simpleGit).toHaveBeenCalledWith(
				expect.objectContaining({
					config: ['core.symlinks=false'],
					unsafe: { allowUnsafeSshCommand: true },
				}),
			);
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

	describe('requiresAdminPushForProjectsMigration', () => {
		beforeEach(() => {
			mockSourceControlPreferencesService.getPreferences.mockReturnValue({
				branchName: 'main',
			} as SourceControlPreferences);
		});

		it('should return true when workflows exist on remote but projects do not', async () => {
			mockGitInstance.raw.mockImplementation(async (args: string[]) => {
				const path = args[2];
				if (path === 'workflows') {
					return '040000 tree abc\tworkflows\n';
				}
				if (path === 'projects') {
					return '';
				}
				return '';
			});

			await expect(sourceControlGitService.requiresAdminPushForProjectsMigration()).resolves.toBe(
				true,
			);
		});

		it('should return false when both workflows and projects exist on remote', async () => {
			mockGitInstance.raw.mockImplementation(async (args: string[]) => {
				const path = args[2];
				if (path === 'workflows' || path === 'projects') {
					return `040000 tree abc\t${path}\n`;
				}
				return '';
			});

			await expect(sourceControlGitService.requiresAdminPushForProjectsMigration()).resolves.toBe(
				false,
			);
		});

		it('should return false when workflows do not exist on remote', async () => {
			mockGitInstance.raw.mockResolvedValue('');

			await expect(sourceControlGitService.requiresAdminPushForProjectsMigration()).resolves.toBe(
				false,
			);
		});

		it('should reject when remote directory check fails (fail closed for migration guard)', async () => {
			mockGitInstance.raw.mockRejectedValue(new Error('network error'));

			await expect(sourceControlGitService.requiresAdminPushForProjectsMigration()).rejects.toThrow(
				'network error',
			);
		});
	});
});
