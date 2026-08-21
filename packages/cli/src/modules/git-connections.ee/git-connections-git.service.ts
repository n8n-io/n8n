import type { GitConnectionType, GitKeyGeneratorType } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { chmod, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
	CheckRepoActions,
	GitPluginError,
	simpleGit,
	type SimpleGit,
	type SimpleGitOptions,
} from 'simple-git';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import { GIT_COMMAND_STALL_TIMEOUT_MS, GIT_KEY_COMMENT } from './constants';
import type { GitConnection } from './database/entities/git-connection.entity';
import {
	buildHttpsGitConfig,
	buildSshCommand,
	generateSshKeyPair,
} from './git-connections-git.utils';

type PlainCredentials =
	| { type: 'ssh'; privateKey: string }
	| { type: 'https'; username: string; password: string };

@Service()
export class GitConnectionsGitService {
	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('git-connections');
	}

	validateRepositoryUrl(repositoryUrl: string, connectionType: GitConnectionType) {
		// `new URL()` silently strips control characters, so reject them up front to
		// keep the persisted/git-handed URL identical to what we validated.
		for (const char of repositoryUrl) {
			const code = char.charCodeAt(0);
			if (code < 32 || code === 127) {
				throw new BadRequestError('Repository URL must not contain control characters');
			}
		}
		if (connectionType === 'https') {
			this.validateHttpsRepositoryUrl(repositoryUrl);
		} else {
			this.validateSshRepositoryUrl(repositoryUrl);
		}
	}

	/**
	 * Accept only `http(s)://` URLs without embedded credentials. Credentials must
	 * come through the encrypted fields, not the stored/returned `repositoryUrl`.
	 */
	private validateHttpsRepositoryUrl(repositoryUrl: string) {
		let url: URL;
		try {
			url = new URL(repositoryUrl);
		} catch {
			throw new BadRequestError('Repository URL must be a valid HTTP or HTTPS URL');
		}
		if (!['http:', 'https:'].includes(url.protocol)) {
			throw new BadRequestError('HTTPS connections require an HTTP or HTTPS repository URL');
		}
		if (url.username || url.password) {
			throw new BadRequestError('Repository URL must not contain credentials');
		}
	}

	/**
	 * Only accept `ssh://host/path` and scp-like `user@host:path`. Reject a
	 * leading `-` (option injection), the `::` transport-helper form (e.g.
	 * `ext::<cmd>`, which runs arbitrary commands), and any non-ssh scheme (e.g.
	 * `file://`, `http://`) — git's remote transports would otherwise let a URL
	 * clone local paths off the host or execute commands.
	 */
	private validateSshRepositoryUrl(repositoryUrl: string) {
		const error = new BadRequestError(
			'SSH connections require an ssh:// or user@host:path repository URL',
		);

		if (repositoryUrl.startsWith('-') || repositoryUrl.includes('::')) throw error;

		const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//.exec(repositoryUrl);
		if (scheme) {
			if (scheme[1].toLowerCase() !== 'ssh') throw error;
			let url: URL;
			try {
				url = new URL(repositoryUrl);
			} catch {
				throw error;
			}
			// A bare username is the legitimate SSH user (e.g. `git@`); a password in
			// the userinfo would be stored/returned in `repositoryUrl` and treated by
			// git as part of the SSH user. Credentials must come through the encrypted fields.
			if (url.password) throw new BadRequestError('Repository URL must not contain credentials');
			if (!url.hostname || !url.pathname || url.pathname === '/') throw error;
			return;
		}

		// On Windows, git reads a drive-letter prefix (`C:\path`, `C:/path`) as a
		// local filesystem path rather than a `host:path` remote, so it would clone
		// off the host's disk. Reject it before the scp-like check treats the drive
		// letter as a hostname. This is a Windows-only interpretation; on other
		// platforms git treats `c:path` as a scp-like remote to host `c`, which is a
		// legitimate one-character SSH alias, so only guard when running on Windows.
		if (process.platform === 'win32' && /^[a-zA-Z]:/.test(repositoryUrl)) throw error;

		// scp-like: [user@]host:path, host must not start with `-`.
		const isScpLike = /^(?:[a-zA-Z0-9_.-]+@)?[a-zA-Z0-9._][a-zA-Z0-9._-]*:[^\s]+$/.test(
			repositoryUrl,
		);
		if (!isScpLike) throw error;
	}

	async validateBranchName(branchName: string) {
		try {
			await simpleGit().raw(['check-ref-format', '--branch', branchName]);
		} catch {
			throw new BadRequestError(`Invalid Git branch name: ${branchName}`);
		}
	}

	async generateSshKeyPair(keyType: GitKeyGeneratorType) {
		return await generateSshKeyPair(keyType, GIT_KEY_COMMENT);
	}

	async clone({
		connection,
		credentials,
		branchName,
		rootFolder,
	}: {
		connection: GitConnection;
		credentials: PlainCredentials;
		branchName: string;
		rootFolder: string;
	}) {
		await this.validateBranchName(branchName);
		await mkdir(rootFolder, { recursive: true });
		const { repositoryFolder, nextRepositoryFolder, sshDir } = this.connectionPaths(rootFolder);
		await rm(nextRepositoryFolder, { recursive: true, force: true });

		try {
			// Clone runs with cwd = rootFolder so it can write repository-next beside
			// the eventual working copy; known_hosts still lives under sshDir.
			await this.withGit({ connection, credentials, repoDir: rootFolder, sshDir }, async (git) => {
				const remoteRefs = await git.listRemote([
					'--heads',
					connection.repositoryUrl,
					`refs/heads/${branchName}`,
				]);
				if (!remoteRefs.trim()) {
					throw new BadRequestError(`Remote branch does not exist: ${branchName}`);
				}
				await git.clone(connection.repositoryUrl, nextRepositoryFolder, [
					'--branch',
					branchName,
					'--single-branch',
					'--no-tags',
					// Emit progress so the stall-timeout backstop keeps resetting during a
					// healthy transfer and only fires when the connection genuinely stalls.
					'--progress',
				]);
				await rm(repositoryFolder, { recursive: true, force: true });
				await rename(nextRepositoryFolder, repositoryFolder);
			});
		} catch (error) {
			await rm(nextRepositoryFolder, { recursive: true, force: true });
			if (error instanceof BadRequestError) throw error;
			// Withhold the raw git output (it can echo the credential-helper config);
			// log only a redacted subset that lets an operator correlate the failure.
			this.logger.warn('Failed to connect to Git repository', {
				connectionId: connection.id,
				branchName,
			});
			throw new BadRequestError('Could not connect to the Git repository');
		}
	}

	/** True only when `<rootFolder>/repository` is itself a git working-copy root. */
	async hasWorkingCopy(rootFolder: string): Promise<boolean> {
		const { repositoryFolder } = this.connectionPaths(rootFolder);
		try {
			// IS_REPO_ROOT (not the default in-tree check) so a working copy that
			// happens to sit under a parent git checkout does not read as connected.
			return await simpleGit({
				baseDir: repositoryFolder,
				binary: 'git',
				maxConcurrentProcesses: 1,
			}).checkIsRepo(CheckRepoActions.IS_REPO_ROOT);
		} catch {
			// Directory missing or not a repo.
			return false;
		}
	}
	/**
	 * Commit the already-exported working copy and push it to the remote branch.
	 * Stages only `stagePathspec` so files the user keeps at the repository root
	 * stay out of the commit. Returns the pushed commit and the resulting HEAD;
	 * on a clean tree it commits nothing and returns `commit: null`.
	 */
	async commitAndPush({
		connection,
		credentials,
		rootFolder,
		branchName,
		author,
		commitMessage,
		force,
		stagePathspec,
	}: {
		connection: GitConnection;
		credentials: PlainCredentials;
		rootFolder: string;
		branchName: string;
		author: { name: string; email: string };
		commitMessage: string;
		force: boolean;
		stagePathspec: string;
	}): Promise<{ commit: string | null; head: string }> {
		const { repositoryFolder, sshDir } = this.connectionPaths(rootFolder);
		try {
			return await this.withGit(
				{
					connection,
					credentials,
					repoDir: repositoryFolder,
					sshDir,
					// Process-local identity, so a concurrent op can't change repo-wide config.
					config: [`user.name=${author.name}`, `user.email=${author.email}`],
				},
				async (git) => {
					// `--all` under the pathspec stages deletions too — the export does
					// rm + rename, so removed entities must be committed as deletions.
					await git.add(['--all', '--', stagePathspec]);
					const status = await git.status(['--', stagePathspec]);
					if (status.isClean()) {
						// Nothing changed since the last push: skip commit + push.
						const head = (await git.revparse(['HEAD'])).trim();
						return { commit: null, head };
					}

					await git.commit(commitMessage);

					if (force) {
						await git.push('origin', branchName, ['-f']);
					} else {
						await git.push('origin', branchName);
					}

					const head = (await git.revparse(['HEAD'])).trim();
					return { commit: head, head };
				},
			);
		} catch (error) {
			throw this.mapGitError(error, { connectionId: connection.id, branchName });
		}
	}

	/**
	 * Remove the cached working copy but keep `.ssh/known_hosts`, so a pinned
	 * host key survives credential rotation and reconnects (preserving MITM
	 * protection). Used when auth/target changes invalidate the clone.
	 */
	async resetWorkingCopy(rootFolder: string) {
		const { repositoryFolder, nextRepositoryFolder } = this.connectionPaths(rootFolder);
		await rm(repositoryFolder, { recursive: true, force: true });
		await rm(nextRepositoryFolder, { recursive: true, force: true });
	}

	/** Remove everything for a connection, including the pinned host key. */
	async cleanup(rootFolder: string) {
		await rm(rootFolder, { recursive: true, force: true });
	}

	/** On-disk layout under a connection's root folder. */
	private connectionPaths(rootFolder: string) {
		return {
			repositoryFolder: path.join(rootFolder, 'repository'),
			nextRepositoryFolder: path.join(rootFolder, 'repository-next'),
			sshDir: path.join(rootFolder, '.ssh'),
		};
	}

	/**
	 * Run a git operation with credentials wired in and torn down afterwards.
	 * Auth is configured per connection type: HTTPS goes through a credential
	 * helper, SSH writes the private key to a temporary file referenced via
	 * `GIT_SSH_COMMAND`. The `finally` block removes that temporary key material
	 * so it never outlives the operation, regardless of success or failure.
	 */
	private async withGit<T>(
		{
			connection,
			credentials,
			repoDir,
			sshDir,
			config: extraConfig = [],
		}: {
			connection: GitConnection;
			credentials: PlainCredentials;
			/** Directory simple-git uses as its process cwd (working-copy root, or clone parent). */
			repoDir: string;
			/** Directory that holds `known_hosts` (the pinned host key). Unused for HTTPS. */
			sshDir: string;
			/** Extra per-invocation `-c` config entries, e.g. `user.name=…`. */
			config?: string[];
		},
		operation: (git: SimpleGit) => Promise<T>,
	) {
		await mkdir(repoDir, { recursive: true });
		const options: Partial<SimpleGitOptions> = {
			baseDir: repoDir,
			binary: 'git',
			maxConcurrentProcesses: 1,
			trimmed: false,
			timeout: { block: GIT_COMMAND_STALL_TIMEOUT_MS },
		};
		let temporaryFolder: string | undefined;

		try {
			let git: SimpleGit;
			if (credentials.type === 'https') {
				const config = [
					...buildHttpsGitConfig(connection.repositoryUrl, credentials),
					...extraConfig,
				];

				git = simpleGit({
					...options,
					config,
					unsafe: { allowUnsafeCredentialHelper: true },
				}).env('GIT_TERMINAL_PROMPT', '0');
			} else {
				temporaryFolder = await mkdtemp(path.join(tmpdir(), 'n8n-git-connection-'));
				const privateKeyPath = path.join(temporaryFolder, 'private-key');
				await writeFile(privateKeyPath, credentials.privateKey, { mode: 0o600 });
				await chmod(privateKeyPath, 0o600);
				// Host key lives in sshDir, not the git working copy, so a key pinned at
				// clone time keeps protecting later fetch/push after resetWorkingCopy.
				await mkdir(sshDir, { recursive: true });
				const sshCommand = buildSshCommand({
					privateKeyPath,
					knownHostsPath: path.join(sshDir, 'known_hosts'),
				});
				git = simpleGit({
					...options,
					config: extraConfig,
					unsafe: { allowUnsafeSshCommand: true },
				})
					.env('GIT_SSH_COMMAND', sshCommand)
					.env('GIT_TERMINAL_PROMPT', '0');
			}
			return await operation(git);
		} finally {
			if (temporaryFolder) await rm(temporaryFolder, { recursive: true, force: true });
		}
	}

	/**
	 * Map a git operation failure to a response error. The stall backstop is the
	 * one transient signal we can detect without inspecting git's output, so it
	 * becomes a retryable 503; everything else is redacted to a generic 400 (raw
	 * git output can echo the credential-helper config, so it is never surfaced or
	 * logged — only a correlatable subset is).
	 */
	private mapGitError(error: unknown, ctx: { connectionId: string; branchName: string }): Error {
		if (error instanceof BadRequestError || error instanceof ServiceUnavailableError) return error;

		if (error instanceof GitPluginError && error.plugin === 'timeout') {
			this.logger.warn('Git operation stalled', ctx);
			return new ServiceUnavailableError('The Git operation timed out. Please try again.');
		}

		this.logger.warn('Git operation failed', ctx);
		return new BadRequestError('Could not complete the Git operation');
	}
}
