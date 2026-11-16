import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import { createDeferredPromise } from '@n8n/utils/promise/deferred-promise';
import { mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { BadRequestError, ServiceUnavailableError } from '@n8n/errors';

import { PromotionGitError, PromotionLocalGitError } from '../promotions-git.error';
import { PromotionsGitService } from '../promotions-git.service';

const { mockGit, simpleGitMock, GitError, GitPluginError } = vi.hoisted(() => {
	const instance = {
		env: vi.fn(),
		add: vi.fn(),
		commit: vi.fn(),
		push: vi.fn(),
		fetch: vi.fn(),
		raw: vi.fn(),
		diff: vi.fn(),
		revparse: vi.fn(),
		checkIsRepo: vi.fn(),
		listRemote: vi.fn(),
		clone: vi.fn(),
		addRemote: vi.fn(),
		show: vi.fn(),
		branch: vi.fn(),
	};
	instance.env.mockReturnValue(instance);
	// Match simple-git's error classes. Every error from Git extends GitError.
	class GitError extends Error {
		constructor(
			readonly task?: { commands: string[] },
			message?: string,
		) {
			super(message);
		}
	}
	class GitPluginError extends GitError {
		constructor(
			task: { commands: string[] } | undefined,
			readonly plugin: string,
			message: string,
		) {
			super(task, message);
		}
	}
	return { mockGit: instance, simpleGitMock: vi.fn(() => instance), GitError, GitPluginError };
});

vi.mock('simple-git', () => ({
	simpleGit: simpleGitMock,
	CheckRepoActions: { IS_REPO_ROOT: 'root' },
	GitError,
	GitPluginError,
}));

describe('PromotionsGitService', () => {
	const service = new PromotionsGitService(mockLogger());

	describe('validateRemoteUrl (token)', () => {
		it('accepts an https URL without embedded credentials', () => {
			expect(() =>
				service.validateRemoteUrl('https://github.com/org/repo.git', 'token'),
			).not.toThrow();
		});

		it('accepts http URLs (internal Git / Gitea on a trusted network)', () => {
			expect(() =>
				service.validateRemoteUrl('http://gitea.internal/org/repo.git', 'token'),
			).not.toThrow();
		});

		it('rejects a URL that embeds credentials', () => {
			expect(() =>
				service.validateRemoteUrl('https://user:pass@github.com/org/repo.git', 'token'),
			).toThrow(BadRequestError);
		});

		it('rejects a non-URL string', () => {
			expect(() => service.validateRemoteUrl('not a url', 'token')).toThrow(BadRequestError);
		});
	});

	describe('control characters', () => {
		it.each([
			['tab', 'https://github.com/org/re\tpo.git'],
			['carriage return', 'https://github.com/org/re\rpo.git'],
			['newline', 'https://github.com/org/re\npo.git'],
		])('rejects an https URL containing a %s', (_label, url) => {
			expect(() => service.validateRemoteUrl(url, 'token')).toThrow(BadRequestError);
		});

		it.each([
			['tab', 'git@github.com:org/re\tpo.git'],
			['carriage return', 'git@github.com:org/re\rpo.git'],
			['newline', 'git@github.com:org/re\npo.git'],
		])('rejects an ssh URL containing a %s', (_label, url) => {
			expect(() => service.validateRemoteUrl(url, 'ssh-key')).toThrow(BadRequestError);
		});
	});

	describe('validateRemoteUrl (ssh-key)', () => {
		it.each([
			'ssh://git@github.com/org/repo.git',
			'ssh://git@github.com:22/org/repo.git',
			'git@github.com:org/repo.git',
			'github.com:org/repo.git',
		])('accepts %s', (url) => {
			expect(() => service.validateRemoteUrl(url, 'ssh-key')).not.toThrow();
		});

		it.each([
			['ext:: transport (command execution)', 'ext::sh -c "id"'],
			['file:// scheme (local repo disclosure)', 'file:///srv/private-repo'],
			['http:// scheme', 'http://github.com/org/repo.git'],
			['git:// scheme', 'git://github.com/org/repo.git'],
			['leading dash (option injection)', '--upload-pack=/tmp/x'],
			['host starting with a dash', 'user@-oProxyCommand=evil:path'],
			['bare ssh:// with no path', 'ssh://github.com'],
			['ssh:// with a password in the userinfo', 'ssh://git:secret@github.com/org/repo.git'],
		])('rejects %s', (_label, url) => {
			expect(() => service.validateRemoteUrl(url, 'ssh-key')).toThrow(BadRequestError);
		});

		describe('drive-letter prefixes', () => {
			const originalPlatform = process.platform;

			const setPlatform = (platform: NodeJS.Platform) => {
				Object.defineProperty(process, 'platform', { value: platform, configurable: true });
			};

			afterEach(() => {
				setPlatform(originalPlatform);
			});

			// git reads `C:\path` / `C:/path` as a local filesystem path only on
			// Windows, where allowing it would clone off the host's disk.
			it.each(['C:/Users/n8n/repo', 'C:\\Users\\n8n\\repo', 'c:repo'])(
				'rejects %s on Windows',
				(url) => {
					setPlatform('win32');
					expect(() => service.validateRemoteUrl(url, 'ssh-key')).toThrow(BadRequestError);
				},
			);

			// On other platforms git treats `c:path` as a scp-like remote to a
			// one-character host, which is a legitimate SSH alias.
			it.each(['C:/Users/n8n/repo', 'c:repo'])('accepts %s on non-Windows', (url) => {
				setPlatform('linux');
				expect(() => service.validateRemoteUrl(url, 'ssh-key')).not.toThrow();
			});
		});
	});
});

const GENERIC_FAILURE = 'Could not complete the Git operation';
const HTTP_AUTH_FAILURE = 'Git authentication failed. Check the provider credentials.';
const SSH_AUTH_FAILURE =
	"SSH authentication failed. Check that the Git host has the provider's public key.";
const REPOSITORY_ACCESS_FAILURE =
	"The Git repository is unavailable or access was denied. Check the repository URL and the provider's permissions.";
const HOST_UNREACHABLE =
	'Could not reach the Git host. Check the repository hostname and network connection.';
const HOST_KEY_FAILURE =
	"Could not verify the Git host's SSH key. Ask your administrator to check the trusted host key.";

// Git prints this after every failed SSH connection.
const SSH_READ_FAILURE =
	'fatal: Could not read from remote repository.\n\nPlease make sure you have the correct access rights\nand the repository exists.';

// Output captured with Git 2.55.0, libcurl 8.7.1, OpenSSH 10.3p1, and LC_ALL=C, unless a row says
// otherwise. Hosts and URLs are placeholders. `fake-secret-token` stands for server-echoed secrets.
const HTTPS_403_OUTPUT =
	"remote: Permission to o/r.git denied to fake-secret-token.\nfatal: unable to access 'https://github.com/o/r.git/': The requested URL returned error: 403";
const SSH_KEY_NOT_ACCEPTED_OUTPUT = `Warning: Permanently added 'github.com' (ED25519) to the list of known hosts.\ngit@github.com: Permission denied (publickey).\n${SSH_READ_FAILURE}`;

const REMOTE_GIT_FAILURES = [
	{
		case: 'HTTPS 401',
		output:
			"remote: Invalid username or token fake-secret-token.\nfatal: Authentication failed for 'https://github.com/o/r.git/'",
		message: HTTP_AUTH_FAILURE,
	},
	{ case: 'HTTPS 403', output: HTTPS_403_OUTPUT, message: REPOSITORY_ACCESS_FAILURE },
	{
		case: 'HTTPS 404 for a mistyped repository URL',
		output:
			"remote: Repository not found.\nfatal: repository 'https://github.com/o/typo.git/' not found",
		message: REPOSITORY_ACCESS_FAILURE,
	},
	{
		case: 'HTTPS DNS failure',
		output:
			"fatal: unable to access 'https://gihub.com/o/r.git/': Could not resolve host: gihub.com",
		message: HOST_UNREACHABLE,
	},
	{
		case: 'HTTPS connection refused',
		output:
			"fatal: unable to access 'https://git.example.com/o/r.git/': Failed to connect to git.example.com port 443 after 3 ms: Couldn't connect to server",
		message: HOST_UNREACHABLE,
	},
	{ case: 'SSH key not accepted', output: SSH_KEY_NOT_ACCEPTED_OUTPUT, message: SSH_AUTH_FAILURE },
	{
		case: 'SSH DNS failure',
		output: `ssh: Could not resolve hostname gihub.com: nodename nor servname provided, or not known\n${SSH_READ_FAILURE}`,
		message: HOST_UNREACHABLE,
	},
	{
		case: 'SSH connection refused',
		output: `ssh: connect to host git.example.com port 22: Connection refused\n${SSH_READ_FAILURE}`,
		message: HOST_UNREACHABLE,
	},
	{
		case: 'SSH host key changed',
		output: `@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\n@    WARNING: REMOTE HOST IDENTIFICATION HAS CHANGED!     @\n@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@\nHost key for github.com has changed and you have requested strict checking.\nHost key verification failed.\n${SSH_READ_FAILURE}`,
		message: HOST_KEY_FAILURE,
	},
	{
		case: 'HTTPS 500',
		output:
			"remote: fake-secret-token\nfatal: unable to access 'https://github.com/o/r.git/': The requested URL returned error: 500",
		message: GENERIC_FAILURE,
	},
	{
		// GitHub server text, not verified locally. Only the provider tells "not found" apart over SSH.
		case: 'SSH repository not found',
		output: `ERROR: Repository not found.\n${SSH_READ_FAILURE}`,
		message: GENERIC_FAILURE,
	},
	{
		case: 'two conflicting causes',
		output: `ssh: connect to host git.example.com port 22: Connection refused\ngit@git.example.com: Permission denied (publickey).\n${SSH_READ_FAILURE}`,
		message: GENERIC_FAILURE,
	},
	{
		case: 'cause-like text inside the URL',
		output:
			"fatal: unable to access 'https://git.example.com/Could not resolve host: x/r.git/': The requested URL returned error: 500",
		message: GENERIC_FAILURE,
	},
	{
		case: 'cause-like text from the server',
		output:
			"remote: fatal: Authentication failed for 'https://github.com/o/r.git/'\nfatal: the remote end hung up unexpectedly",
		message: GENERIC_FAILURE,
	},
];

describe('PromotionsGitService (git operations)', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const gitService = new PromotionsGitService(logger);

	const remoteUrl = 'https://github.com/o/r.git';
	// Most cases use token credentials to avoid temporary SSH key files.
	const credentials = { authType: 'token' as const, username: 'u', password: 'p' };
	const environmentId = 'cfg1';

	let rootFolder: string;
	let paths: {
		rootFolder: string;
		repositoryFolder: string;
		nextRepositoryFolder: string;
		sshDir: string;
		trashFolder: string;
	};

	beforeEach(async () => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		mockGit.env.mockReturnValue(mockGit);
		rootFolder = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-op-'));
		paths = {
			rootFolder,
			repositoryFolder: path.join(rootFolder, 'repository'),
			nextRepositoryFolder: path.join(rootFolder, 'repository-next'),
			sshDir: path.join(rootFolder, '.ssh'),
			trashFolder: path.join(rootFolder, 'trash'),
		};
	});

	afterEach(async () => {
		await rm(rootFolder, { recursive: true, force: true });
	});

	describe('hasCheckout', () => {
		it('returns true when the repository folder is a git repo root', async () => {
			mockGit.checkIsRepo.mockResolvedValue(true);

			await expect(gitService.hasCheckout(paths.repositoryFolder)).resolves.toBe(true);
			expect(simpleGitMock).toHaveBeenCalledWith(
				expect.objectContaining({ baseDir: paths.repositoryFolder }),
			);
			expect(mockGit.checkIsRepo).toHaveBeenCalledWith('root');
		});

		it('returns false when it is not a repo root', async () => {
			mockGit.checkIsRepo.mockResolvedValue(false);
			await expect(gitService.hasCheckout(paths.repositoryFolder)).resolves.toBe(false);
		});

		it('returns false when the directory is missing', async () => {
			mockGit.checkIsRepo.mockRejectedValue(new Error('not a repo'));
			await expect(gitService.hasCheckout(paths.repositoryFolder)).resolves.toBe(false);
		});
	});

	describe('clone', () => {
		const call = async () =>
			await gitService.clone({ remoteUrl, credentials, paths, branchName: 'main', environmentId });

		beforeEach(() => {
			// Mirror filesystem side effects needed by rename assertions.
			mockGit.raw.mockImplementation(async (args: unknown) => {
				if (Array.isArray(args) && args[0] === 'init') {
					await mkdir(String(args[args.length - 1]), { recursive: true });
				}
				return '';
			});
			mockGit.clone.mockImplementation(async (_url: unknown, dir: unknown) => {
				await mkdir(String(dir), { recursive: true });
				return '';
			});
		});

		it('clones the single branch when it exists on the remote', async () => {
			mockGit.listRemote.mockResolvedValue('abc123\trefs/heads/main\n');

			await call();

			expect(mockGit.clone).toHaveBeenCalledWith(remoteUrl, paths.nextRepositoryFolder, [
				'--branch',
				'main',
				'--single-branch',
				'--no-tags',
				'--progress',
			]);
			await expect(stat(paths.repositoryFolder)).resolves.toBeDefined();
		});

		it('moves the old checkout to trash, puts the new one in place, and empties the trash', async () => {
			mockGit.listRemote.mockResolvedValue('abc123\trefs/heads/main\n');
			await mkdir(paths.repositoryFolder, { recursive: true });
			await writeFile(path.join(paths.repositoryFolder, 'old-checkout'), 'old');
			mockGit.clone.mockImplementation(async (_url: unknown, dir: unknown) => {
				await mkdir(String(dir), { recursive: true });
				await writeFile(path.join(String(dir), 'new-checkout'), 'new');
				return '';
			});

			await call();

			await expect(
				readFile(path.join(paths.repositoryFolder, 'new-checkout'), 'utf8'),
			).resolves.toBe('new');
			await expect(stat(path.join(paths.repositoryFolder, 'old-checkout'))).rejects.toMatchObject({
				code: 'ENOENT',
			});
			await expect(stat(paths.nextRepositoryFolder)).rejects.toMatchObject({ code: 'ENOENT' });
			await expect(readdir(paths.trashFolder)).resolves.toEqual([]);
		});

		it.each([
			{
				credentials: {
					authType: 'token' as const,
					username: 'promotion-user',
					password: 'promotion-password',
				},
				secrets: ['promotion-user', 'promotion-password'],
				env: [
					['N8N_GIT_USERNAME', 'promotion-user'],
					['N8N_GIT_PASSWORD', 'promotion-password'],
				],
			},
			{
				credentials: { authType: 'ssh-key' as const, privateKey: 'fake-private-key' },
				secrets: ['fake-private-key'],
				env: [
					['GIT_SSH_COMMAND', expect.stringContaining('StrictHostKeyChecking=accept-new')],
					// The SSH command line is visible to other processes, so the key must stay in a file.
					['GIT_SSH_COMMAND', expect.not.stringContaining('fake-private-key')],
				],
			},
		])(
			'passes $credentials.authType credentials and the C locale through the operation environment',
			async ({ credentials: operationCredentials, secrets, env }) => {
				mockGit.listRemote.mockResolvedValue('abc123\trefs/heads/main\n');

				await gitService.clone({
					remoteUrl,
					credentials: operationCredentials,
					paths,
					branchName: 'main',
					environmentId,
				});

				const options = JSON.stringify(simpleGitMock.mock.calls);
				for (const secret of secrets) expect(options).not.toContain(secret);
				for (const [name, value] of [['GIT_TERMINAL_PROMPT', '0'], ['LC_ALL', 'C'], ...env]) {
					expect(mockGit.env).toHaveBeenCalledWith(name, value);
				}
			},
		);

		it.each(REMOTE_GIT_FAILURES)(
			'explains a remote failure only with clear evidence: $case',
			async ({ output, message }) => {
				mockGit.listRemote.mockRejectedValue(
					new GitError({ commands: ['ls-remote', '--heads', remoteUrl] }, output),
				);

				const error = await call().catch((e: unknown) => e);

				// Exact fixed text and log arguments keep raw output and secrets out of both.
				expect(error).toBeInstanceOf(PromotionGitError);
				expect((error as Error).message).toBe(message);
				expect(logger.warn.mock.calls).toEqual([
					['Git operation failed', { environmentId, branchName: 'main' }],
				]);
			},
		);

		it('reports a stalled clone as a retryable 503 and removes the partial checkout', async () => {
			mockGit.listRemote.mockResolvedValue('abc123\trefs/heads/main\n');
			mockGit.clone.mockImplementationOnce(async () => {
				await mkdir(paths.nextRepositoryFolder, { recursive: true });
				throw new GitPluginError(undefined, 'timeout', 'block timeout reached');
			});

			await expect(call()).rejects.toThrow(ServiceUnavailableError);
			await expect(stat(paths.nextRepositoryFolder)).rejects.toMatchObject({ code: 'ENOENT' });
		});

		it("does not delete another request's in-progress staging directory", async () => {
			mockGit.listRemote.mockResolvedValue('abc123\trefs/heads/main\n');
			const firstClone = createDeferredPromise();
			const sentinelPath = path.join(paths.nextRepositoryFolder, 'clone-in-progress');
			let cloneCalls = 0;
			mockGit.clone.mockImplementation(async (_url: unknown, dir: unknown) => {
				cloneCalls += 1;
				await mkdir(String(dir), { recursive: true });
				if (cloneCalls === 1) {
					await writeFile(sentinelPath, 'first-clone');
					await firstClone.promise;
				}
			});

			const first = call();
			await vi.waitFor(() => expect(mockGit.clone).toHaveBeenCalledTimes(1));

			const second = call();
			await vi.waitFor(() => {
				const checkRefCalls = mockGit.raw.mock.calls.filter(
					(args) => Array.isArray(args[0]) && args[0][0] === 'check-ref-format',
				);
				expect(checkRefCalls).toHaveLength(2);
			});
			await expect(readFile(sentinelPath, 'utf8')).resolves.toBe('first-clone');

			firstClone.resolve();
			await Promise.all([first, second]);
		});

		it('bootstraps a checkout on the target branch when the remote is empty', async () => {
			mockGit.listRemote.mockResolvedValue('');

			await call();

			expect(mockGit.clone).not.toHaveBeenCalled();
			expect(mockGit.raw).toHaveBeenCalledWith([
				'init',
				'--initial-branch=main',
				paths.nextRepositoryFolder,
			]);
			expect(simpleGitMock).toHaveBeenCalledWith(
				expect.objectContaining({ baseDir: paths.nextRepositoryFolder }),
			);
			expect(mockGit.addRemote).toHaveBeenCalledWith('origin', remoteUrl);
			await expect(stat(paths.repositoryFolder)).resolves.toBeDefined();
		});

		it('reports a missing branch instead of bootstrapping a remote that has branches', async () => {
			mockGit.listRemote
				.mockResolvedValueOnce('') // requested branch not found
				.mockResolvedValueOnce('def456\trefs/heads/develop\n'); // remote is not empty

			const error = await call().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(BadRequestError);
			expect((error as Error).message).toBe('Remote branch does not exist: main');
			expect(mockGit.clone).not.toHaveBeenCalled();
		});
	});

	describe('commitAndPush', () => {
		const onCheckoutRestored = vi.fn(async () => {});
		const call = async (over: Record<string, unknown> = {}) =>
			await gitService.commitAndPush({
				remoteUrl,
				credentials,
				paths,
				branchName: 'main',
				environmentId,
				author: { name: 'Ada Lovelace', email: 'ada@example.com' },
				commitMessage: 'sync',
				force: false,
				stagePathspec: 'n8n',
				onCheckoutRestored,
				...over,
			});

		beforeEach(() => {
			mockGit.revparse.mockResolvedValue('abc123\n');
			mockGit.raw.mockResolvedValue('');
			mockGit.diff.mockResolvedValue('n8n/manifest.json\n');
		});

		it('pushes to a new branch and restores the local base branch', async () => {
			mockGit.raw.mockResolvedValueOnce('base\n');
			mockGit.revparse.mockResolvedValueOnce('commit\n');

			const result = await call({
				targetBranchName: 'n8n-promotion/2026-01-01T00-00-00-000Z',
			});

			expect(mockGit.push).toHaveBeenCalledWith(
				'origin',
				'HEAD:refs/heads/n8n-promotion/2026-01-01T00-00-00-000Z',
			);
			expect(mockGit.raw).toHaveBeenCalledWith(['reset', '--hard', 'base']);
			expect(onCheckoutRestored).toHaveBeenCalled();
			expect(result).toEqual({ commitSha: 'commit' });
		});

		it('runs the push check after the commit and just before the push', async () => {
			const beforePush = vi.fn();

			await call({ beforePush });

			expect(beforePush).toHaveBeenCalledOnce();
			expect(mockGit.commit.mock.invocationCallOrder[0]).toBeLessThan(
				beforePush.mock.invocationCallOrder[0],
			);
			expect(beforePush.mock.invocationCallOrder[0]).toBeLessThan(
				mockGit.push.mock.invocationCallOrder[0],
			);
		});

		it('does not push and rolls back the commit when the push check throws', async () => {
			mockGit.raw.mockResolvedValueOnce('previous\n');
			const stopped = new ServiceUnavailableError('stopped');

			await expect(
				call({
					rollbackOnFailure: true,
					beforePush: () => {
						throw stopped;
					},
				}),
			).rejects.toBe(stopped);

			expect(mockGit.push).not.toHaveBeenCalled();
			expect(mockGit.raw).toHaveBeenCalledWith(['reset', '--mixed', 'previous']);
		});

		it('does not push a new branch and restores the base branch when the push check throws', async () => {
			mockGit.raw.mockResolvedValueOnce('base\n');
			const stopped = new ServiceUnavailableError('stopped');

			await expect(
				call({
					targetBranchName: 'n8n-promotion/x',
					beforePush: () => {
						throw stopped;
					},
				}),
			).rejects.toBe(stopped);

			expect(mockGit.push).not.toHaveBeenCalled();
			expect(mockGit.raw).toHaveBeenCalledWith(['reset', '--hard', 'base']);
			expect(onCheckoutRestored).toHaveBeenCalled();
		});

		it('restores the local base branch when a new branch push fails', async () => {
			mockGit.raw.mockResolvedValueOnce('base\n');
			mockGit.revparse.mockResolvedValueOnce('commit\n');
			mockGit.push.mockRejectedValueOnce(new Error('remote: rejected'));

			await expect(call({ targetBranchName: 'n8n-promotion/x' })).rejects.toThrow(BadRequestError);
			expect(mockGit.raw).toHaveBeenCalledWith(['reset', '--hard', 'base']);
			expect(onCheckoutRestored).toHaveBeenCalled();
		});

		it('rejects a new branch push when the local base branch does not exist', async () => {
			await expect(call({ targetBranchName: 'n8n-promotion/x' })).rejects.toThrow(
				'Local branch does not exist: main',
			);
			expect(mockGit.commit).not.toHaveBeenCalled();
			expect(mockGit.push).not.toHaveBeenCalled();
		});

		it('keeps a successful result when the local reset fails', async () => {
			mockGit.raw.mockResolvedValueOnce('base\n').mockRejectedValueOnce(new Error('reset failed'));
			mockGit.revparse.mockResolvedValueOnce('commit\n');

			await expect(call({ targetBranchName: 'n8n-promotion/x' })).resolves.toEqual({
				commitSha: 'commit',
			});
			expect(logger.warn).toHaveBeenCalledWith('Failed to restore Git checkout after promotion', {
				branchName: 'main',
				targetBranchName: 'n8n-promotion/x',
			});
			expect(onCheckoutRestored).not.toHaveBeenCalled();
		});

		it('keeps the push error when the local reset also fails', async () => {
			mockGit.raw.mockResolvedValueOnce('base\n').mockRejectedValueOnce(new Error('reset failed'));
			mockGit.revparse.mockResolvedValueOnce('commit\n');
			mockGit.push.mockRejectedValueOnce(
				new GitPluginError(undefined, 'timeout', 'block timeout reached'),
			);

			await expect(call({ targetBranchName: 'n8n-promotion/x' })).rejects.toThrow(
				ServiceUnavailableError,
			);
			expect(onCheckoutRestored).not.toHaveBeenCalled();
		});

		it('reports a stalled push as a retryable 503', async () => {
			mockGit.push.mockRejectedValueOnce(
				new GitPluginError(undefined, 'timeout', 'block timeout reached'),
			);
			await expect(call()).rejects.toThrow(ServiceUnavailableError);
		});

		it.each([false, true])(
			'preserves the push outcome when the checkout cannot be trusted again: push failure %s',
			async (pushFails) => {
				mockGit.raw.mockResolvedValueOnce('base\n');
				mockGit.revparse.mockResolvedValueOnce('commit\n');
				onCheckoutRestored.mockRejectedValueOnce(new Error('Descriptor write failed'));
				if (pushFails) {
					mockGit.push.mockRejectedValueOnce(
						new GitPluginError(undefined, 'timeout', 'block timeout reached'),
					);
				}

				const result = call({ targetBranchName: 'n8n-promotion/x' });

				if (pushFails) {
					await expect(result).rejects.toThrow(ServiceUnavailableError);
				} else {
					await expect(result).resolves.toEqual({ commitSha: 'commit' });
				}
				expect(onCheckoutRestored).toHaveBeenCalled();
				// The reset worked, so the warning must point at the descriptor, not at Git.
				expect(logger.warn).toHaveBeenCalledWith(
					'Failed to trust the Git checkout after promotion',
					{
						branchName: 'main',
						targetBranchName: 'n8n-promotion/x',
					},
				);
			},
		);

		it('force-pushes when requested', async () => {
			await call({ force: true });

			expect(mockGit.push).toHaveBeenCalledWith('origin', 'main', ['-f']);
		});

		it('restores HEAD and the index when the push fails', async () => {
			mockGit.raw.mockResolvedValueOnce('before\n');
			mockGit.push.mockRejectedValueOnce(new Error('push rejected'));

			await expect(call({ rollbackOnFailure: true })).rejects.toThrow(BadRequestError);

			expect(mockGit.raw.mock.calls).toEqual([
				[['for-each-ref', '--format=%(objectname)', 'refs/heads/main']],
				[['reset', '--mixed', 'before']],
			]);
			expect(mockGit.raw.mock.invocationCallOrder[0]).toBeLessThan(
				mockGit.add.mock.invocationCallOrder[0],
			);
			expect(mockGit.raw.mock.invocationCallOrder[1]).toBeGreaterThan(
				mockGit.push.mock.invocationCallOrder[0],
			);
		});

		it('keeps the push error when rollback fails', async () => {
			const pushError = new ServiceUnavailableError('Push timed out');
			mockGit.push.mockRejectedValueOnce(pushError);
			mockGit.raw
				.mockResolvedValueOnce('before\n')
				.mockRejectedValueOnce(new Error('reset failed'));

			await expect(call({ rollbackOnFailure: true })).rejects.toBe(pushError);

			expect(logger.warn.mock.calls).toContainEqual([
				'Failed to restore the Git revision after a failed promotion',
				{ environmentId, branchName: 'main' },
			]);
		});

		it('keeps the new commit when the push succeeds', async () => {
			mockGit.raw.mockResolvedValueOnce('before\n');
			mockGit.revparse.mockResolvedValueOnce('after\n');

			await expect(call({ rollbackOnFailure: true })).resolves.toEqual({ commitSha: 'after' });

			expect(mockGit.push).toHaveBeenCalledExactlyOnceWith('origin', 'main');
			expect(mockGit.raw).toHaveBeenCalledExactlyOnceWith([
				'for-each-ref',
				'--format=%(objectname)',
				'refs/heads/main',
			]);
		});

		it.each([
			{
				case: 'an explained push failure',
				output: HTTPS_403_OUTPUT,
				message: REPOSITORY_ACCESS_FAILURE,
			},
			{
				case: 'an unexplained push failure',
				output:
					"remote: fake-secret-token\nTo https://github.com/o/r.git\n ! [rejected]        main -> main (non-fast-forward)\nerror: failed to push some refs to 'https://github.com/o/r.git'",
				message: GENERIC_FAILURE,
			},
		])('redacts $case and keeps raw git output out of the log', async ({ output, message }) => {
			mockGit.push.mockRejectedValue(
				new GitError({ commands: ['push', 'origin', 'main'] }, output),
			);

			const error = await call().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(PromotionGitError);
			expect((error as Error).message).toBe(message);
			const logged = JSON.stringify(logger.warn.mock.calls);
			expect(logged).not.toContain('fake-secret-token');
			expect(logged).not.toContain('github.com');
		});
	});

	describe('listBranchTree', () => {
		const commitSha = 'c'.repeat(40);
		// `paths` is created per test, so build the operation when a test runs.
		const operation = () => ({
			remoteUrl,
			credentials,
			paths,
			branchName: 'main',
			environmentId,
			pathspecs: ['n8n/manifest.json', 'n8n/projects/'],
		});

		beforeEach(() => {
			mockGit.revparse.mockResolvedValue(`${commitSha}\n`);
			mockGit.raw.mockResolvedValue('');
		});

		it('lists the tree at the fetched tip and returns that commit', async () => {
			mockGit.raw.mockResolvedValueOnce('100644 blob b1\tn8n/manifest.json\0');

			const result = await gitService.listBranchTree(operation());

			expect(mockGit.fetch).toHaveBeenCalledWith(
				'origin',
				'+refs/heads/main:refs/remotes/origin/main',
				['--progress'],
			);
			expect(mockGit.revparse).toHaveBeenCalledWith(['refs/remotes/origin/main']);
			expect(mockGit.raw).toHaveBeenCalledWith([
				'ls-tree',
				'-r',
				'-z',
				commitSha,
				'--',
				'n8n/manifest.json',
				'n8n/projects/',
			]);
			expect(result).toEqual({
				commitSha,
				lsTreeOutput: '100644 blob b1\tn8n/manifest.json\0',
			});
		});

		it('reports no commit when the remote has none yet', async () => {
			mockGit.fetch.mockRejectedValueOnce(new Error("couldn't find remote ref"));
			mockGit.branch.mockResolvedValueOnce({ all: [] } as never);
			mockGit.listRemote.mockResolvedValueOnce('');

			await expect(gitService.listBranchTree(operation())).resolves.toEqual({
				commitSha: null,
				lsTreeOutput: '',
			});
			expect(mockGit.revparse).not.toHaveBeenCalled();
		});

		it('explains a failed fetch of a branch that was fetched before', async () => {
			mockGit.fetch.mockRejectedValueOnce(
				new GitError({ commands: ['fetch', 'origin'] }, SSH_KEY_NOT_ACCEPTED_OUTPUT),
			);
			mockGit.branch.mockResolvedValueOnce({ all: ['origin/main'] } as never);

			const error = await gitService.listBranchTree(operation()).catch((e: unknown) => e);

			expect(error).toBeInstanceOf(PromotionGitError);
			expect((error as Error).message).toBe(SSH_AUTH_FAILURE);
		});

		it('runs operations on one checkout one at a time', async () => {
			const fetching = createDeferredPromise();
			mockGit.fetch.mockReturnValueOnce(fetching.promise);

			const first = gitService.listBranchTree(operation());
			const second = gitService.listBranchTree(operation());
			await vi.waitFor(() => expect(mockGit.fetch).toHaveBeenCalledTimes(1));
			fetching.resolve();
			await Promise.all([first, second]);

			const [firstFetch, secondFetch] = mockGit.fetch.mock.invocationCallOrder;
			const [firstListing] = mockGit.raw.mock.invocationCallOrder;
			expect(firstListing).toBeGreaterThan(firstFetch);
			expect(firstListing).toBeLessThan(secondFetch);
		});
	});

	describe('readFilesAtCommit', () => {
		const commitSha = 'c'.repeat(40);
		const filePaths = ['n8n/manifest.json', 'n8n/projects/a-p1/workflows/b-w1/workflow.json'];
		const read = async (over: Record<string, unknown> = {}) =>
			await gitService.readFilesAtCommit({
				paths,
				branchName: 'main',
				environmentId,
				commitSha,
				filePaths,
				...over,
			});

		it('reads the files of one commit in a batch with bounded concurrency', async () => {
			mockGit.show.mockImplementation(async ([spec]: string[]) => `content of ${spec}`);

			const files = await read();

			expect([...files]).toEqual(
				filePaths.map((filePath) => [filePath, `content of ${commitSha}:${filePath}`]),
			);
			expect(simpleGitMock).toHaveBeenCalledTimes(1);
			expect(simpleGitMock).toHaveBeenCalledWith(
				expect.objectContaining({
					baseDir: paths.repositoryFolder,
					trimmed: false,
					maxConcurrentProcesses: 4,
				}),
			);
		});

		it('waits for the checkout lock, so a fetch in progress finishes first', async () => {
			const fetching = createDeferredPromise();
			mockGit.fetch.mockReturnValueOnce(fetching.promise);
			mockGit.revparse.mockResolvedValue(`${commitSha}\n`);
			mockGit.raw.mockResolvedValue('');
			mockGit.show.mockResolvedValue('{}');
			const listing = gitService.listBranchTree({
				remoteUrl,
				credentials,
				paths,
				branchName: 'main',
				environmentId,
				pathspecs: ['n8n/'],
			});
			await vi.waitFor(() => expect(mockGit.fetch).toHaveBeenCalledTimes(1));

			const reading = read();
			await new Promise((resolve) => setImmediate(resolve));
			expect(mockGit.show).not.toHaveBeenCalled();

			fetching.resolve();
			await Promise.all([listing, reading]);
			expect(mockGit.show).toHaveBeenCalledTimes(filePaths.length);
		});

		it('returns nothing without calling Git for an empty list', async () => {
			await expect(read({ filePaths: [] })).resolves.toEqual(new Map());
			expect(simpleGitMock).not.toHaveBeenCalled();
		});

		it('rejects a commit that is not an object name before calling Git', async () => {
			await expect(read({ commitSha: 'origin/main' })).rejects.toThrow(
				'The commit SHA is not a Git object name',
			);
			expect(mockGit.show).not.toHaveBeenCalled();
		});

		it('redacts a read failure', async () => {
			mockGit.show.mockRejectedValue(new Error("fatal: path 'secret' does not exist"));

			await expect(read()).rejects.toThrow('Could not complete the Git operation');
			expect(JSON.stringify(logger.warn.mock.calls)).not.toContain('secret');
		});
	});

	describe('hasRemoteBranch', () => {
		const call = async () =>
			await gitService.hasRemoteBranch({
				remoteUrl,
				credentials,
				paths,
				branchName: 'main',
				environmentId,
			});

		it('reports a branch that the remote holds', async () => {
			mockGit.listRemote.mockResolvedValue('def456\trefs/heads/main\n');

			await expect(call()).resolves.toBe(true);
			expect(mockGit.listRemote).toHaveBeenCalledWith(['--heads', 'origin', 'refs/heads/main']);
			expect(mockGit.fetch).not.toHaveBeenCalled();
		});

		it('reports a branch that the remote does not hold', async () => {
			mockGit.listRemote.mockResolvedValue('');

			await expect(call()).resolves.toBe(false);
		});

		it('throws when the remote cannot be reached', async () => {
			mockGit.listRemote.mockRejectedValue(new Error('Could not resolve host: github.com'));

			await expect(call()).rejects.toThrow(BadRequestError);
		});
	});

	describe('prepareCheckoutForPromotion', () => {
		const call = async () =>
			await gitService.prepareCheckoutForPromotion({
				remoteUrl,
				credentials,
				paths,
				branchName: 'main',
				environmentId,
			});

		it('fetches and resets to the configured remote base branch, and returns that commit', async () => {
			mockGit.listRemote.mockResolvedValue('def456\trefs/heads/main\n');
			mockGit.revparse.mockResolvedValue('d'.repeat(40) + '\n');

			await expect(call()).resolves.toEqual({ commitSha: 'd'.repeat(40) });
			expect(mockGit.revparse).toHaveBeenCalledWith(['HEAD']);

			expect(mockGit.fetch).toHaveBeenCalledWith(
				'origin',
				'+refs/heads/main:refs/remotes/origin/main',
				['--progress'],
			);
			expect(mockGit.raw).toHaveBeenCalledWith(['reset', '--hard', 'origin/main']);
		});

		it('removes untracked files from the package folder only, after the reset', async () => {
			mockGit.listRemote.mockResolvedValue('def456\trefs/heads/main\n');
			mockGit.revparse.mockResolvedValue('d'.repeat(40) + '\n');

			await call();

			expect(mockGit.raw.mock.calls).toEqual([
				[['reset', '--hard', 'origin/main']],
				[['clean', '-ffdx', '--', 'n8n']],
			]);
		});

		it('rejects a promotion when the remote base branch does not exist', async () => {
			mockGit.listRemote.mockResolvedValue('');

			await expect(call()).rejects.toThrow('Remote branch does not exist: main');
			expect(mockGit.fetch).not.toHaveBeenCalled();
			expect(mockGit.raw).not.toHaveBeenCalled();
		});
	});

	describe('prepareCheckoutForFirstPush', () => {
		const call = async () =>
			await gitService.prepareCheckoutForFirstPush({ paths, branchName: 'main', environmentId });

		const trackingRefCall = ['for-each-ref', '--format=%(objectname)', 'refs/remotes/origin/main'];
		const localBranchCall = ['for-each-ref', '--format=%(objectname)', 'refs/heads/main'];

		it('removes the local branch, empties the index, and cleans the package folder', async () => {
			mockGit.raw.mockResolvedValueOnce('').mockResolvedValueOnce('c'.repeat(40) + '\n');

			await call();

			expect(mockGit.raw.mock.calls).toEqual([
				[trackingRefCall],
				[localBranchCall],
				[['update-ref', '-d', 'refs/heads/main']],
				[['read-tree', '--empty']],
				[['clean', '-ffdx', '--', 'n8n']],
			]);
		});

		it('keeps a branch with no commits as it is, and still cleans the package folder', async () => {
			mockGit.raw.mockResolvedValueOnce('').mockResolvedValueOnce('');

			await call();

			expect(mockGit.raw.mock.calls).toEqual([
				[trackingRefCall],
				[localBranchCall],
				[['read-tree', '--empty']],
				[['clean', '-ffdx', '--', 'n8n']],
			]);
		});

		it('keeps the local branch when the checkout saw the branch on the remote before', async () => {
			mockGit.raw.mockResolvedValueOnce('d'.repeat(40) + '\n');

			await call();

			expect(mockGit.raw.mock.calls).toEqual([[trackingRefCall]]);
		});

		it('contacts no remote', async () => {
			mockGit.raw.mockResolvedValueOnce('').mockResolvedValueOnce('');

			await call();

			expect(mockGit.listRemote).not.toHaveBeenCalled();
			expect(mockGit.fetch).not.toHaveBeenCalled();
		});
	});

	describe('removeLeftoverLockFiles', () => {
		const call = async () =>
			await gitService.removeLeftoverLockFiles({ paths, branchName: 'main', environmentId });

		const gitPath = (...segments: string[]) =>
			path.join(paths.repositoryFolder, '.git', ...segments);

		const writeGitFile = async (...segments: string[]) => {
			await mkdir(path.dirname(gitPath(...segments)), { recursive: true });
			await writeFile(gitPath(...segments), 'content');
		};

		const exists = async (...segments: string[]) =>
			await stat(gitPath(...segments)).then(
				() => true,
				() => false,
			);

		it('removes the index, HEAD, and local branch lock files, also in nested branch folders', async () => {
			await writeGitFile('index.lock');
			await writeGitFile('HEAD.lock');
			await writeGitFile('refs', 'heads', 'main.lock');
			await writeGitFile('refs', 'heads', 'team', 'feature.lock');

			await call();

			expect(await exists('index.lock')).toBe(false);
			expect(await exists('HEAD.lock')).toBe(false);
			expect(await exists('refs', 'heads', 'main.lock')).toBe(false);
			expect(await exists('refs', 'heads', 'team', 'feature.lock')).toBe(false);
			expect(await exists('refs', 'heads', 'team')).toBe(true);
			for (const lockFile of [
				'index.lock',
				'HEAD.lock',
				path.join('refs', 'heads', 'main.lock'),
				path.join('refs', 'heads', 'team', 'feature.lock'),
			]) {
				expect(logger.debug).toHaveBeenCalledWith(
					'Removed a leftover Git lock file from the promotion checkout',
					{ environmentId, lockFile },
				);
			}
		});

		it('keeps branch refs, remote-tracking lock files, and FETCH_HEAD', async () => {
			await writeGitFile('refs', 'heads', 'main');
			await writeGitFile('refs', 'remotes', 'origin', 'main.lock');
			await writeGitFile('FETCH_HEAD');
			await writeGitFile('index');

			await call();

			expect(await exists('refs', 'heads', 'main')).toBe(true);
			expect(await exists('refs', 'remotes', 'origin', 'main.lock')).toBe(true);
			expect(await exists('FETCH_HEAD')).toBe(true);
			expect(await exists('index')).toBe(true);
			expect(logger.debug).not.toHaveBeenCalled();
		});

		it('does nothing when no lock file exists', async () => {
			await mkdir(gitPath(), { recursive: true });

			await expect(call()).resolves.toBeUndefined();

			expect(await readdir(gitPath())).toEqual([]);
			expect(logger.debug).not.toHaveBeenCalled();
		});

		it('runs no Git command', async () => {
			await writeGitFile('index.lock');

			await call();

			expect(simpleGitMock).not.toHaveBeenCalled();
		});
	});

	describe('refreshCheckout', () => {
		const call = async () =>
			await gitService.refreshCheckout({
				remoteUrl,
				credentials,
				paths,
				branchName: 'main',
				environmentId,
			});

		beforeEach(() => {
			mockGit.revparse.mockResolvedValue('def456\n');
		});

		it('fetches and hard-resets to the remote tip, returning the new revision', async () => {
			const result = await call();

			expect(mockGit.fetch).toHaveBeenCalledWith(
				'origin',
				'+refs/heads/main:refs/remotes/origin/main',
				['--progress'],
			);
			expect(mockGit.raw).toHaveBeenCalledWith(['reset', '--hard', 'origin/main']);
			expect(result).toEqual({ commitSha: 'def456' });
		});

		it('reports a failed call to the remote as a Git error', async () => {
			mockGit.fetch.mockRejectedValueOnce(
				new GitError({ commands: ['-c', 'protocol.version=2', 'fetch', 'origin'] }),
			);

			const error = await call().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(PromotionGitError);
		});

		it('reports a failed local Git command as a local error', async () => {
			mockGit.fetch.mockRejectedValueOnce(
				new GitError(
					{ commands: ['checkout', 'main'] },
					"fatal: Authentication failed for 'https://github.com/o/r.git/'",
				),
			);

			const error = await call().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(PromotionLocalGitError);
			expect(error).not.toBeInstanceOf(PromotionGitError);
			// Only remote failures are explained.
			expect((error as Error).message).toBe(GENERIC_FAILURE);
		});

		it('reports a local file failure as a local error, with the same response', async () => {
			mockGit.fetch.mockRejectedValueOnce(new Error('EACCES: permission denied'));

			const error = await call().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(PromotionLocalGitError);
			expect(error).toBeInstanceOf(BadRequestError);
			expect((error as Error).message).toBe('Could not complete the Git operation');
		});

		it('redacts a fetch failure instead of surfacing raw git output', async () => {
			mockGit.fetch.mockRejectedValueOnce(new Error('remote: fatal secret-token'));

			const error = await call().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(BadRequestError);
			expect((error as Error).message).toBe('Could not complete the Git operation');
		});
	});
});
