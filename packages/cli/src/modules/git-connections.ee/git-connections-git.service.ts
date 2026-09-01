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
import { ServiceUnavailableError } from '@/errors/response-errors/service-unavailable.error';

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

	// Credentials must come from encrypted fields, never the repository URL.
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

	// Accept only SSH remotes; Git transport helpers and local paths can execute or expose host data.
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
			if (url.password) throw new BadRequestError('Repository URL must not contain credentials');
			if (!url.hostname || !url.pathname || url.pathname === '/') throw error;
			return;
		}

		// On Windows, Git interprets drive-letter prefixes as local paths.
		if (process.platform === 'win32' && /^[a-zA-Z]:/.test(repositoryUrl)) throw error;

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
			// Clone from the root so repository-next sits beside the working copy.
			await this.withGit({ connection, credentials, repoDir: rootFolder, sshDir }, async (git) => {
				const branchRefs = await git.listRemote([
					'--heads',
					connection.repositoryUrl,
					`refs/heads/${branchName}`,
				]);
				if (!branchRefs.trim()) {
					// Bootstrap only an empty remote; otherwise the requested branch is missing.
					const anyRefs = await git.listRemote(['--heads', connection.repositoryUrl]);
					if (anyRefs.trim()) {
						throw new BadRequestError(`Remote branch does not exist: ${branchName}`);
					}
					// branchName is check-ref-format validated and passed without a shell.
					await git.raw(['init', `--initial-branch=${branchName}`, nextRepositoryFolder]);
					await git.raw([
						'-C',
						nextRepositoryFolder,
						'remote',
						'add',
						'origin',
						connection.repositoryUrl,
					]);
				} else {
					await git.clone(connection.repositoryUrl, nextRepositoryFolder, [
						'--branch',
						branchName,
						'--single-branch',
						'--no-tags',
						// Keep the stall timeout fed during a healthy transfer.
						'--progress',
					]);
				}
				await rm(repositoryFolder, { recursive: true, force: true });
				await rename(nextRepositoryFolder, repositoryFolder);
			});
		} catch (error) {
			await rm(nextRepositoryFolder, { recursive: true, force: true });
			if (error instanceof BadRequestError) throw error;
			// Raw Git output can include credential-helper config.
			this.logger.warn('Failed to connect to Git repository', {
				connectionId: connection.id,
				branchName,
			});
			throw new BadRequestError('Could not connect to the Git repository');
		}
	}

	async hasWorkingCopy(rootFolder: string): Promise<boolean> {
		const { repositoryFolder } = this.connectionPaths(rootFolder);
		try {
			// Do not accept a directory merely nested under another working copy.
			return await simpleGit({
				baseDir: repositoryFolder,
				binary: 'git',
				maxConcurrentProcesses: 1,
			}).checkIsRepo(CheckRepoActions.IS_REPO_ROOT);
		} catch {
			return false;
		}
	}

	async commitAndPush({
		connection,
		credentials,
		rootFolder,
		branchName,
		targetBranchName,
		author,
		commitMessage,
		force,
		stagePathspec,
	}: {
		connection: GitConnection;
		credentials: PlainCredentials;
		rootFolder: string;
		branchName: string;
		/** When set, push the commit to this new remote branch instead of `branchName`. */
		targetBranchName?: string;
		author: { name: string; email: string };
		commitMessage: string;
		force: boolean;
		stagePathspec: string;
	}): Promise<{ commitSha: string; head: string }> {
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
					if (targetBranchName) {
						return await this.commitAndPushToTargetBranch(git, {
							targetBranchName,
							commitMessage,
							stagePathspec,
						});
					}

					// Scope staging to the export while including removed entities.
					await git.add(['--all', '--', stagePathspec]);
					await git.commit(commitMessage);
					const commitSha = (await git.revparse(['HEAD'])).trim();

					if (force) {
						await git.push('origin', branchName, ['-f']);
					} else {
						await git.push('origin', branchName);
					}

					return { commitSha, head: commitSha };
				},
			);
		} catch (error) {
			throw this.mapGitError(error, {
				connectionId: connection.id,
				branchName: targetBranchName ?? branchName,
			});
		}
	}

	/**
	 * Commit on the checked-out branch, push the commit to a new remote branch,
	 * and pin the local branch back to where it was. Each promote branch is then
	 * the configured branch plus exactly one commit, and the working copy stays
	 * on the configured branch. If the process dies before the reset, the stray
	 * local commit is harmless: the next push commits a full snapshot on top,
	 * and a pull hard-resets to the remote branch anyway.
	 */
	private async commitAndPushToTargetBranch(
		git: SimpleGit,
		{
			targetBranchName,
			commitMessage,
			stagePathspec,
		}: { targetBranchName: string; commitMessage: string; stagePathspec: string },
	): Promise<{ commitSha: string; head: string }> {
		const preCommitHead = (await git.revparse(['HEAD'])).trim();
		try {
			// Scope staging to the export while including removed entities.
			await git.add(['--all', '--', stagePathspec]);
			await git.commit(commitMessage);
			const commitSha = (await git.revparse(['HEAD'])).trim();
			// A refspec push; `force` does not apply — the target branch must be new.
			await git.push('origin', `HEAD:refs/heads/${targetBranchName}`);
			return { commitSha, head: preCommitHead };
		} finally {
			await git.raw(['reset', '--hard', preCommitHead]);
		}
	}

	async refreshWorkingCopy({
		connection,
		credentials,
		rootFolder,
		branchName,
	}: {
		connection: GitConnection;
		credentials: PlainCredentials;
		rootFolder: string;
		branchName: string;
	}): Promise<{ head: string }> {
		const { repositoryFolder, sshDir } = this.connectionPaths(rootFolder);
		try {
			return await this.withGit(
				{ connection, credentials, repoDir: repositoryFolder, sshDir },
				async (git) => {
					// --progress keeps the stall-timeout timer fed during a healthy transfer.
					await git.fetch('origin', branchName, ['--progress']);
					await git.raw(['reset', '--hard', `origin/${branchName}`]);
					const head = (await git.revparse(['HEAD'])).trim();
					return { head };
				},
			);
		} catch (error) {
			throw this.mapGitError(error, { connectionId: connection.id, branchName });
		}
	}

	// Preserve the pinned host key when authentication or target settings change.
	async resetWorkingCopy(rootFolder: string) {
		const { repositoryFolder, nextRepositoryFolder } = this.connectionPaths(rootFolder);
		await rm(repositoryFolder, { recursive: true, force: true });
		await rm(nextRepositoryFolder, { recursive: true, force: true });
	}

	async cleanup(rootFolder: string) {
		await rm(rootFolder, { recursive: true, force: true });
	}

	private connectionPaths(rootFolder: string) {
		return {
			repositoryFolder: path.join(rootFolder, 'repository'),
			nextRepositoryFolder: path.join(rootFolder, 'repository-next'),
			sshDir: path.join(rootFolder, '.ssh'),
		};
	}

	// Configure credentials per operation and remove temporary SSH key material afterwards.
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
			repoDir: string;
			sshDir: string;
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
				// Keep the host key outside the resettable working copy.
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

	// Timeouts are retryable; all other Git errors are redacted because output may contain secrets.
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
