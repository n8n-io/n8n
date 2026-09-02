import type { Logger } from '@n8n/backend-common';
import { mockLogger } from '@n8n/backend-test-utils';
import { mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { mock } from 'vitest-mock-extended';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';

import type { GitConnection } from '../database/entities/git-connection.entity';
import { GitConnectionsGitService } from '../git-connections-git.service';

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

describe('GitConnectionsGitService', () => {
	const service = new GitConnectionsGitService(mockLogger());

	describe('validateRepositoryUrl (https)', () => {
		it('accepts an https URL without embedded credentials', () => {
			expect(() =>
				service.validateRepositoryUrl('https://github.com/org/repo.git', 'https'),
			).not.toThrow();
		});

		it('accepts http URLs (internal Git / Gitea on a trusted network)', () => {
			expect(() =>
				service.validateRepositoryUrl('http://gitea.internal/org/repo.git', 'https'),
			).not.toThrow();
		});

		it('rejects a URL that embeds credentials', () => {
			expect(() =>
				service.validateRepositoryUrl('https://user:pass@github.com/org/repo.git', 'https'),
			).toThrow(BadRequestError);
		});

		it('rejects a non-URL string', () => {
			expect(() => service.validateRepositoryUrl('not a url', 'https')).toThrow(BadRequestError);
		});
	});

	describe('control characters', () => {
		it.each([
			['tab', 'https://github.com/org/re\tpo.git'],
			['carriage return', 'https://github.com/org/re\rpo.git'],
			['newline', 'https://github.com/org/re\npo.git'],
		])('rejects an https URL containing a %s', (_label, url) => {
			expect(() => service.validateRepositoryUrl(url, 'https')).toThrow(BadRequestError);
		});

		it.each([
			['tab', 'git@github.com:org/re\tpo.git'],
			['carriage return', 'git@github.com:org/re\rpo.git'],
			['newline', 'git@github.com:org/re\npo.git'],
		])('rejects an ssh URL containing a %s', (_label, url) => {
			expect(() => service.validateRepositoryUrl(url, 'ssh')).toThrow(BadRequestError);
		});
	});

	describe('validateRepositoryUrl (ssh)', () => {
		it.each([
			'ssh://git@github.com/org/repo.git',
			'ssh://git@github.com:22/org/repo.git',
			'git@github.com:org/repo.git',
			'github.com:org/repo.git',
		])('accepts %s', (url) => {
			expect(() => service.validateRepositoryUrl(url, 'ssh')).not.toThrow();
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
			expect(() => service.validateRepositoryUrl(url, 'ssh')).toThrow(BadRequestError);
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
					expect(() => service.validateRepositoryUrl(url, 'ssh')).toThrow(BadRequestError);
				},
			);

			// On other platforms git treats `c:path` as a scp-like remote to a
			// one-character host, which is a legitimate SSH alias.
			it.each(['C:/Users/n8n/repo', 'c:repo'])('accepts %s on non-Windows', (url) => {
				setPlatform('linux');
				expect(() => service.validateRepositoryUrl(url, 'ssh')).not.toThrow();
			});
		});
	});
});

describe('GitConnectionsGitService (git operations)', () => {
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const gitService = new GitConnectionsGitService(logger);

	// Use HTTPS to avoid temporary SSH key files in unit tests.
	const httpsConnection = () =>
		({
			id: '1',
			repositoryUrl: 'https://github.com/o/r.git',
			connectionType: 'https',
		}) as GitConnection;
	const httpsCredentials = { type: 'https' as const, username: 'u', password: 'p' };

	let rootFolder: string;

	beforeEach(async () => {
		vi.clearAllMocks();
		logger.scoped.mockReturnValue(logger);
		mockGit.env.mockReturnValue(mockGit);
		rootFolder = await mkdtemp(path.join(tmpdir(), 'n8n-git-op-'));
	});

	afterEach(async () => {
		await rm(rootFolder, { recursive: true, force: true });
	});

	describe('hasWorkingCopy', () => {
		it('returns true when the repository folder is a git repo root', async () => {
			mockGit.checkIsRepo.mockResolvedValue(true);

			await expect(gitService.hasWorkingCopy(rootFolder)).resolves.toBe(true);
			expect(simpleGitMock).toHaveBeenCalledWith(
				expect.objectContaining({ baseDir: path.join(rootFolder, 'repository') }),
			);
			expect(mockGit.checkIsRepo).toHaveBeenCalledWith('root');
		});

		it('returns false when it is not a repo root', async () => {
			mockGit.checkIsRepo.mockResolvedValue(false);
			await expect(gitService.hasWorkingCopy(rootFolder)).resolves.toBe(false);
		});

		it('returns false when the check throws (directory missing)', async () => {
			mockGit.checkIsRepo.mockRejectedValue(new Error('not a repo'));
			await expect(gitService.hasWorkingCopy(rootFolder)).resolves.toBe(false);
		});
	});

	describe('clone', () => {
		const repositoryFolder = () => path.join(rootFolder, 'repository');
		const nextRepositoryFolder = () => path.join(rootFolder, 'repository-next');

		const call = async (over: Record<string, unknown> = {}) =>
			await gitService.clone({
				connection: httpsConnection(),
				credentials: httpsCredentials,
				branchName: 'main',
				rootFolder,
				...over,
			});

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

			expect(mockGit.clone).toHaveBeenCalledWith(
				httpsConnection().repositoryUrl,
				nextRepositoryFolder(),
				['--branch', 'main', '--single-branch', '--no-tags', '--progress'],
			);
			await expect(stat(repositoryFolder())).resolves.toBeDefined();
		});

		it('bootstraps a working copy on the target branch when the remote is empty', async () => {
			mockGit.listRemote.mockResolvedValue('');

			await call();

			expect(mockGit.clone).not.toHaveBeenCalled();
			expect(mockGit.raw).toHaveBeenCalledWith([
				'init',
				'--initial-branch=main',
				nextRepositoryFolder(),
			]);
			expect(mockGit.raw).toHaveBeenCalledWith([
				'-C',
				nextRepositoryFolder(),
				'remote',
				'add',
				'origin',
				httpsConnection().repositoryUrl,
			]);
			await expect(stat(repositoryFolder())).resolves.toBeDefined();
		});

		it('throws when the branch is missing but the remote already has other branches', async () => {
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
				connection: httpsConnection(),
				credentials: httpsCredentials,
				rootFolder,
				branchName: 'main',
				author: { name: 'Ada Lovelace', email: 'ada@example.com' },
				commitMessage: 'sync',
				force: false,
				stagePathspec: 'n8n-export',
				...over,
			});

		beforeEach(() => {
			mockGit.revparse.mockResolvedValue('abc123\n');
		});

		it('maps a stall timeout to a 503', async () => {
			mockGit.push.mockRejectedValueOnce(
				new GitPluginError(undefined, 'timeout', 'block timeout reached'),
			);
			await expect(call()).rejects.toThrow(ServiceUnavailableError);
		});

		it('maps any other failure to a redacted 400 and never logs raw git output', async () => {
			mockGit.push.mockRejectedValue(new Error('remote: rejected [non-fast-forward] secret-token'));

			const error = await call().catch((e: unknown) => e);

			expect(error).toBeInstanceOf(BadRequestError);
			expect((error as Error).message).toBe('Could not complete the Git operation');
			const logged = JSON.stringify(logger.warn.mock.calls);
			expect(logged).not.toContain('secret-token');
			expect(logged).not.toContain('non-fast-forward');
		});
	});

	describe('refreshWorkingCopy', () => {
		const call = async () =>
			await gitService.refreshWorkingCopy({
				connection: httpsConnection(),
				credentials: httpsCredentials,
				rootFolder,
				branchName: 'main',
			});

		beforeEach(() => {
			mockGit.revparse.mockResolvedValue('def456\n');
		});

		it('fetches and hard-resets to the remote tip, returning the new head', async () => {
			const result = await call();

			expect(mockGit.fetch).toHaveBeenCalledWith('origin', 'main', ['--progress']);
			expect(mockGit.raw).toHaveBeenCalledWith(['reset', '--hard', 'origin/main']);
			expect(result).toEqual({ head: 'def456' });
		});

		it('maps a stall timeout to a 503', async () => {
			mockGit.fetch.mockRejectedValueOnce(
				new GitPluginError(undefined, 'timeout', 'block timeout reached'),
			);
			await expect(call()).rejects.toThrow(ServiceUnavailableError);
		});

		it('maps any other failure to a redacted 400', async () => {
			mockGit.fetch.mockRejectedValueOnce(new Error('boom'));
			await expect(call()).rejects.toThrow(BadRequestError);
		});
	});
});
