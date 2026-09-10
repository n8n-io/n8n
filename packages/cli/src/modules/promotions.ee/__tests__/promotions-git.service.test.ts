import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';

import { PromotionsGitService } from '../promotions-git.service';

const { mockGit, simpleGitMock, GitPluginError } = vi.hoisted(() => {
	const instance = {
		env: vi.fn(),
		add: vi.fn(),
		commit: vi.fn(),
		push: vi.fn(),
		fetch: vi.fn(),
		raw: vi.fn(),
		revparse: vi.fn(),
		checkIsRepo: vi.fn(),
		listRemote: vi.fn(),
		clone: vi.fn(),
	};
	instance.env.mockReturnValue(instance);
	// Match simple-git's timeout error shape.
	class GitPluginError extends Error {
		constructor(
			readonly task: unknown,
			readonly plugin: string,
			message: string,
		) {
			super(message);
		}
	}
	return { mockGit: instance, simpleGitMock: vi.fn(() => instance), GitPluginError };
});

vi.mock('simple-git', () => ({
	simpleGit: simpleGitMock,
	CheckRepoActions: { IS_REPO_ROOT: 'root' },
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

describe('PromotionsGitService (git operations)', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const gitService = new PromotionsGitService(logger);

	const remoteUrl = 'https://github.com/o/r.git';
	// Use HTTP(S) credentials to avoid temporary SSH key files in unit tests.
	const credentials = { authType: 'token' as const, username: 'u', password: 'p' };
	const configId = 'cfg1';

	let rootFolder: string;
	let paths: {
		rootFolder: string;
		repositoryFolder: string;
		nextRepositoryFolder: string;
		sshDir: string;
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
			await gitService.clone({ remoteUrl, credentials, paths, branchName: 'main', configId });

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

		it('passes token credentials through the operation environment', async () => {
			mockGit.listRemote.mockResolvedValue('abc123\trefs/heads/main\n');
			const tokenCredentials = {
				authType: 'token' as const,
				username: 'promotion-user',
				password: 'promotion-password',
			};

			await gitService.clone({
				remoteUrl,
				credentials: tokenCredentials,
				paths,
				branchName: 'main',
				configId,
			});

			const options = JSON.stringify(simpleGitMock.mock.calls);
			expect(options).not.toContain(tokenCredentials.username);
			expect(options).not.toContain(tokenCredentials.password);
			expect(mockGit.env).toHaveBeenCalledWith('N8N_GIT_USERNAME', tokenCredentials.username);
			expect(mockGit.env).toHaveBeenCalledWith('N8N_GIT_PASSWORD', tokenCredentials.password);
		});

		it('reports a stalled clone as a retryable 503 and removes the partial checkout', async () => {
			mockGit.listRemote.mockResolvedValue('abc123\trefs/heads/main\n');
			mockGit.clone.mockImplementationOnce(async () => {
				await mkdir(paths.nextRepositoryFolder, { recursive: true });
				throw new GitPluginError(undefined, 'timeout', 'block timeout reached');
			});

			await expect(call()).rejects.toThrow(ServiceUnavailableError);
			await expect(stat(paths.nextRepositoryFolder)).rejects.toMatchObject({ code: 'ENOENT' });
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
			expect(mockGit.raw).toHaveBeenCalledWith([
				'-C',
				paths.nextRepositoryFolder,
				'remote',
				'add',
				'origin',
				remoteUrl,
			]);
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
		const call = async (over: Record<string, unknown> = {}) =>
			await gitService.commitAndPush({
				remoteUrl,
				credentials,
				paths,
				branchName: 'main',
				configId,
				author: { name: 'Ada Lovelace', email: 'ada@example.com' },
				commitMessage: 'sync',
				force: false,
				stagePathspec: 'n8n-export',
				...over,
			});

		beforeEach(() => {
			mockGit.revparse.mockResolvedValue('abc123\n');
		});

		it('reports a stalled push as a retryable 503', async () => {
			mockGit.push.mockRejectedValueOnce(
				new GitPluginError(undefined, 'timeout', 'block timeout reached'),
			);
			await expect(call()).rejects.toThrow(ServiceUnavailableError);
		});

		it('force-pushes when requested', async () => {
			await call({ force: true });

			expect(mockGit.push).toHaveBeenCalledWith('origin', 'main', ['-f']);
		});

		it('redacts a push failure and keeps raw git output out of the log', async () => {
			mockGit.push.mockRejectedValue(new Error('remote: rejected [non-fast-forward] secret-token'));

			const error = await call().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(BadRequestError);
			expect((error as Error).message).toBe('Could not complete the Git operation');
			const logged = JSON.stringify(logger.warn.mock.calls);
			expect(logged).not.toContain('secret-token');
			expect(logged).not.toContain('non-fast-forward');
		});
	});

	describe('refreshCheckout', () => {
		const call = async () =>
			await gitService.refreshCheckout({
				remoteUrl,
				credentials,
				paths,
				branchName: 'main',
				configId,
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

		it('redacts a fetch failure instead of surfacing raw git output', async () => {
			mockGit.fetch.mockRejectedValueOnce(new Error('remote: fatal secret-token'));

			const error = await call().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(BadRequestError);
			expect((error as Error).message).toBe('Could not complete the Git operation');
		});
	});
});
