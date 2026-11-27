import type { Logger } from '@n8n/backend-common';
import { lstat, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { simpleGit, type SimpleGit } from 'simple-git';
import { mock } from 'vitest-mock-extended';

import { startSelfSignedGitServer, TLS_VERIFICATION_ERROR } from '@test/self-signed-git-server';

import { SourceControlGitService } from '../source-control-git.service.ee';
import type { SourceControlPreferencesService } from '../source-control-preferences.service.ee';
import type { SourceControlPreferences } from '../types/source-control-preferences';

describe('SourceControlGitService TLS trust', () => {
	const originalEnv = process.env;
	let server: Awaited<ReturnType<typeof startSelfSignedGitServer>>;

	beforeAll(async () => {
		server = await startSelfSignedGitServer();
	});

	beforeEach(() => {
		process.env = { ...originalEnv };
		delete process.env.GIT_SSL_CAINFO;
	});

	afterAll(async () => {
		process.env = originalEnv;
		await server.close();
	});

	const listRemote = async () => {
		const { repositoryUrl } = server;
		const preferences = mock<SourceControlPreferencesService>();
		preferences.getPreferences.mockReturnValue(
			mock<SourceControlPreferences>({ connectionType: 'https', repositoryUrl }),
		);
		preferences.getDecryptedHttpsCredentials.mockResolvedValue({ username: 'u', password: 'p' });
		const service = new SourceControlGitService(mock(), mock(), preferences);
		await service.setGitCommand(server.dir, server.dir);
		await service.git!.listRemote([repositoryUrl]);
	};

	it('rejects a self-signed certificate without GIT_SSL_CAINFO', async () => {
		await expect(listRemote()).rejects.toThrow(TLS_VERIFICATION_ERROR);
	});

	it('trusts the certificate when GIT_SSL_CAINFO names it', async () => {
		process.env.GIT_SSL_CAINFO = server.certPath;

		await expect(listRemote()).resolves.toBeUndefined();
	});
});

describe('SourceControlGitService Git synchronization', () => {
	let testFolder: string;
	let publisherFolder: string;
	let worktreeFolder: string;
	let publisherGit: SimpleGit;
	let gitService: SourceControlGitService;

	const tagsPath = () => path.join(publisherFolder, 'tags.json');

	const publish = async (message: string) => {
		await publisherGit.add(['-A']);
		await publisherGit.commit(message);
		await publisherGit.push('origin', 'main');
	};

	beforeEach(async () => {
		testFolder = await mkdtemp(path.join(tmpdir(), 'n8n-source-control-git-'));
		const remoteFolder = path.join(testFolder, 'remote.git');
		publisherFolder = path.join(testFolder, 'publisher');
		worktreeFolder = path.join(testFolder, 'worktree');

		await mkdir(remoteFolder);
		await simpleGit(remoteFolder).init(true);
		await mkdir(publisherFolder);
		publisherGit = simpleGit(publisherFolder);
		await publisherGit.init();
		await publisherGit.addConfig('user.name', 'n8n test');
		await publisherGit.addConfig('user.email', 'n8n@example.com');
		await publisherGit.addConfig('core.symlinks', 'true');
		await writeFile(tagsPath(), '{"version":1}\n');
		await publisherGit.add(['tags.json']);
		await publisherGit.commit('Initial fixture');
		await publisherGit.branch(['-M', 'main']);
		await publisherGit.addRemote('origin', remoteFolder);
		await publisherGit.push('origin', 'main', ['--set-upstream']);

		await simpleGit().clone(remoteFolder, worktreeFolder, ['--branch', 'main']);

		gitService = new SourceControlGitService(mock<Logger>(), mock(), mock());
		gitService.git = simpleGit({
			baseDir: worktreeFolder,
			config: ['core.symlinks=false'],
			trimmed: false,
		});
		vi.spyOn(gitService, 'fetch').mockImplementation(async () => await gitService.git!.fetch());
	});

	afterEach(async () => {
		// Retry the cleanup: git child processes can still be finalizing writes
		// under the object store when the temp folder removal starts.
		await rm(testFolder, { force: true, recursive: true, maxRetries: 3, retryDelay: 100 });
	});

	describe('stale push', () => {
		const commitInWorktree = async (message: string) => {
			const git = gitService.git!;
			await git.addConfig('user.name', 'n8n test');
			await git.addConfig('user.email', 'n8n@example.com');
			await writeFile(path.join(worktreeFolder, 'local.json'), `{"message":"${message}"}\n`);
			await git.add(['local.json']);
			await git.commit(message);
		};

		it('reports the remote as ahead after another clone pushes', async () => {
			expect(await gitService.isRemoteAhead('main')).toBe(false);

			await writeFile(tagsPath(), '{"version":2}\n');
			await publish('Remote change');
			await gitService.fetch();

			expect(await gitService.isRemoteAhead('main')).toBe(true);
		});

		it('does not report the remote as ahead for local-only commits', async () => {
			await commitInWorktree('Local change');
			await gitService.fetch();

			expect(await gitService.isRemoteAhead('main')).toBe(false);
		});

		it('compares the remote with a given commit after the work folder was fast-forwarded', async () => {
			// The status call fast-forwards the work folder, so HEAD alone cannot show unsynced commits.
			const syncedSha = await gitService.getHeadCommit();
			await writeFile(tagsPath(), '{"version":2}\n');
			await publish('Remote change');
			await gitService.fetch();
			await gitService.git!.merge(['--ff-only', 'origin/main']);

			expect(await gitService.isRemoteAhead('main')).toBe(false);
			expect(await gitService.isRemoteAhead('main', syncedSha)).toBe(true);
		});

		it('counts an unknown commit as ahead, so that the instance has to pull', async () => {
			const unknown = '0'.repeat(40);
			await gitService.fetch();

			expect(await gitService.isRemoteAhead('main', unknown)).toBe(true);
			// Also when the work folder is already at the remote tip.
			expect(await gitService.isRemoteAhead('main')).toBe(false);
			expect(await gitService.isRemoteAhead('main', unknown)).toBe(true);
		});

		it('returns the commit that HEAD points at', async () => {
			const expected = (await gitService.git!.revparse(['HEAD'])).trim();

			expect(await gitService.getHeadCommit()).toBe(expected);
		});

		it('returns false when the remote branch does not exist', async () => {
			expect(await gitService.isRemoteAhead('missing-branch')).toBe(false);
		});

		it('rejects a normal push and keeps the remote commit reachable', async () => {
			await writeFile(tagsPath(), '{"version":2}\n');
			await publish('Remote change');
			const remoteSha = (await publisherGit.revparse(['HEAD'])).trim();
			await commitInWorktree('Local change');

			await expect(gitService.push({ branch: 'main', force: false })).rejects.toThrow();

			const verifier = path.join(testFolder, 'verifier');
			await simpleGit().clone(path.join(testFolder, 'remote.git'), verifier, ['--branch', 'main']);
			expect((await simpleGit(verifier).revparse(['HEAD'])).trim()).toBe(remoteSha);
		});
	});

	it('should update only after the managed tree passes validation', async () => {
		await writeFile(tagsPath(), '{"version":2}\n');
		await publish('Update regular entry');

		await gitService.pull();
		await expect(readFile(path.join(worktreeFolder, 'tags.json'), 'utf8')).resolves.toBe(
			'{"version":2}\n',
		);

		const validatedHead = await gitService.git!.revparse('HEAD');
		await rm(tagsPath());
		await symlink('../outside.json', tagsPath());
		await publish('Update managed entry');

		await expect(gitService.pull()).rejects.toThrow(
			'The remote repository contains an unsupported source control entry.',
		);
		await expect(gitService.git!.revparse('HEAD')).resolves.toBe(validatedHead);
		expect((await lstat(path.join(worktreeFolder, 'tags.json'))).isFile()).toBe(true);
		await expect(readFile(path.join(worktreeFolder, 'tags.json'), 'utf8')).resolves.toBe(
			'{"version":2}\n',
		);

		await rm(tagsPath());
		await writeFile(tagsPath(), '{"version":3}\n');
		await publish('Restore regular entry');

		await gitService.pull();
		await expect(readFile(path.join(worktreeFolder, 'tags.json'), 'utf8')).resolves.toBe(
			'{"version":3}\n',
		);
	});

	it('should reject a directory placed at a managed file path', async () => {
		await writeFile(tagsPath(), '{"version":2}\n');
		await publish('Seed regular entry');
		await gitService.pull();
		const validatedHead = await gitService.git!.revparse('HEAD');

		// Replace the tags.json file with a directory of the same name.
		await rm(tagsPath());
		await mkdir(tagsPath());
		await writeFile(path.join(tagsPath(), 'inner.json'), '{"version":3}\n');
		await publish('Replace managed file with directory');

		await expect(gitService.pull()).rejects.toThrow(
			'The remote repository contains an unsupported source control entry.',
		);
		await expect(gitService.git!.revparse('HEAD')).resolves.toBe(validatedHead);
		expect((await lstat(path.join(worktreeFolder, 'tags.json'))).isFile()).toBe(true);
		await expect(readFile(path.join(worktreeFolder, 'tags.json'), 'utf8')).resolves.toBe(
			'{"version":2}\n',
		);
	});

	it('should reject a file placed at a managed directory path', async () => {
		await writeFile(tagsPath(), '{"version":2}\n');
		await publish('Seed regular entry');
		await gitService.pull();
		const validatedHead = await gitService.git!.revparse('HEAD');

		// Add a regular file where the workflows directory is expected.
		await writeFile(path.join(publisherFolder, 'workflows'), 'not a directory\n');
		await publish('Add file at managed directory path');

		await expect(gitService.pull()).rejects.toThrow(
			'The remote repository contains an unsupported source control entry.',
		);
		await expect(gitService.git!.revparse('HEAD')).resolves.toBe(validatedHead);
	});

	it('should ignore an unsupported entry outside managed paths', async () => {
		const docsFolder = path.join(publisherFolder, 'docs');
		await mkdir(docsFolder);
		await symlink('../outside.txt', path.join(docsFolder, 'reference'));
		await writeFile(tagsPath(), '{"version":2}\n');
		await publish('Update repository entries');

		await gitService.pull();

		await expect(readFile(path.join(worktreeFolder, 'tags.json'), 'utf8')).resolves.toBe(
			'{"version":2}\n',
		);
	});
});
