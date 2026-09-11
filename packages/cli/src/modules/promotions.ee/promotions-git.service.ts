import type { PromotionProviderAuthType, PromotionSshKeyType } from '@n8n/api-types';
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

import { GIT_COMMAND_STALL_TIMEOUT_MS, PROMOTION_KEY_COMMENT } from './constants';
import { buildHttpsGitConfig, buildSshCommand, generateSshKeyPair } from './promotions-git.utils';
import type { PromotionGitCredentials } from './promotions.types';

/** Where one config keeps its checkout and its pinned host keys. */
type PromotionGitPaths = {
	rootFolder: string;
	repositoryFolder: string;
	nextRepositoryFolder: string;
	sshDir: string;
};

type GitOperation = {
	remoteUrl: string;
	credentials: PromotionGitCredentials;
	paths: PromotionGitPaths;
	branchName: string;
	/** Only for logging, so a failure points at the right config. */
	configId: string;
};

const BASE_GIT_OPTIONS = {
	binary: 'git',
	maxConcurrentProcesses: 1,
	trimmed: false,
	timeout: { block: GIT_COMMAND_STALL_TIMEOUT_MS },
	config: ['core.autocrlf=false'],
} satisfies Partial<SimpleGitOptions>;

/**
 * Plain-Git transport. Takes plain values, so it never sees an ORM entity and can
 * be given a snapshot taken before the operation started.
 */
@Service()
export class PromotionsGitService {
	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('promotions');
	}

	/** The provider's auth method decides which remote URL forms are accepted. */
	validateRemoteUrl(remoteUrl: string, authType: PromotionProviderAuthType) {
		// `new URL()` silently strips control characters, so reject them up front to
		// keep the persisted/git-handed URL identical to what we validated.
		for (const char of remoteUrl) {
			const code = char.charCodeAt(0);
			if (code < 32 || code === 127) {
				throw new BadRequestError('Remote URL must not contain control characters');
			}
		}
		if (authType === 'token') {
			this.validateHttpRemoteUrl(remoteUrl);
		} else {
			this.validateSshRemoteUrl(remoteUrl);
		}
	}

	// Credentials must come from the encrypted provider payload, never the remote URL.
	private validateHttpRemoteUrl(remoteUrl: string) {
		let url: URL;
		try {
			url = new URL(remoteUrl);
		} catch {
			throw new BadRequestError('Remote URL must be a valid HTTP or HTTPS URL');
		}
		if (!['http:', 'https:'].includes(url.protocol)) {
			throw new BadRequestError('Username and password providers require an HTTP(S) remote URL');
		}
		if (url.username || url.password) {
			throw new BadRequestError('Remote URL must not contain credentials');
		}
	}

	// Accept only SSH remotes; Git transport helpers and local paths can execute or expose host data.
	private validateSshRemoteUrl(remoteUrl: string) {
		const error = new BadRequestError(
			'SSH key providers require an ssh:// or [user@]host:path remote URL',
		);

		if (remoteUrl.startsWith('-') || remoteUrl.includes('::')) throw error;

		const scheme = /^([a-zA-Z][a-zA-Z0-9+.-]*):\/\//.exec(remoteUrl);
		if (scheme) {
			if (scheme[1].toLowerCase() !== 'ssh') throw error;
			let url: URL;
			try {
				url = new URL(remoteUrl);
			} catch {
				throw error;
			}
			if (url.password) throw new BadRequestError('Remote URL must not contain credentials');
			if (!url.hostname || !url.pathname || url.pathname === '/') throw error;
			return;
		}

		// On Windows, Git interprets drive-letter prefixes as local paths.
		if (process.platform === 'win32' && /^[a-zA-Z]:/.test(remoteUrl)) throw error;

		// Git uses the default SSH user when the remote omits one.
		const isScpLike = /^(?:[a-zA-Z0-9_.-]+@)?[a-zA-Z0-9._][a-zA-Z0-9._-]*:[^\s]+$/.test(remoteUrl);
		if (!isScpLike) throw error;
	}

	async validateBranchName(branchName: string) {
		try {
			await simpleGit().raw(['check-ref-format', '--branch', branchName]);
		} catch {
			throw new BadRequestError(`Invalid Git branch name: ${branchName}`);
		}
	}

	async generateSshKeyPair(keyType: PromotionSshKeyType) {
		return await generateSshKeyPair(keyType, PROMOTION_KEY_COMMENT);
	}

	async clone({ remoteUrl, credentials, paths, branchName, configId }: GitOperation) {
		await this.validateBranchName(branchName);
		await mkdir(paths.rootFolder, { recursive: true });
		const { repositoryFolder, nextRepositoryFolder, sshDir } = paths;
		await rm(nextRepositoryFolder, { recursive: true, force: true });

		try {
			// Clone from the root so repository-next sits beside the checkout.
			await this.withGit(
				{ remoteUrl, credentials, repoDir: paths.rootFolder, sshDir },
				async (git) => {
					const branchRefs = await git.listRemote([
						'--heads',
						remoteUrl,
						`refs/heads/${branchName}`,
					]);
					if (!branchRefs.trim()) {
						// Bootstrap only an empty remote; otherwise the requested branch is missing.
						const anyRefs = await git.listRemote([remoteUrl]);
						if (anyRefs.trim()) {
							throw new BadRequestError(`Remote branch does not exist: ${branchName}`);
						}
						// branchName is check-ref-format validated and passed without a shell.
						await git.raw(['init', `--initial-branch=${branchName}`, nextRepositoryFolder]);
						await git.raw(['-C', nextRepositoryFolder, 'remote', 'add', 'origin', remoteUrl]);
					} else {
						await git.clone(remoteUrl, nextRepositoryFolder, [
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
				},
			);
		} catch (error) {
			await rm(nextRepositoryFolder, { recursive: true, force: true });
			throw this.mapGitError(error, { configId, branchName });
		}
	}

	async hasCheckout(repositoryFolder: string): Promise<boolean> {
		try {
			// Do not accept a directory merely nested under another checkout.
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
		remoteUrl,
		credentials,
		paths,
		branchName,
		targetBranchName,
		configId,
		author,
		commitMessage,
		force,
		stagePathspec,
		onCheckoutRestored,
	}: GitOperation & {
		/** Push to this new branch instead of the configured base branch. */
		targetBranchName?: string;
		author: { name: string; email: string };
		commitMessage: string;
		force: boolean;
		stagePathspec: string;
		/** Called only after the checkout returns to its base commit. */
		onCheckoutRestored: () => Promise<void>;
	}): Promise<{ commitSha: string }> {
		try {
			return await this.withGit(
				{
					remoteUrl,
					credentials,
					repoDir: paths.repositoryFolder,
					sshDir: paths.sshDir,
					// Process-local identity, so a concurrent op can't change repo-wide config.
					config: [`user.name=${author.name}`, `user.email=${author.email}`],
				},
				async (git) => {
					if (targetBranchName) {
						return await this.commitAndPushToTargetBranch(git, {
							branchName,
							targetBranchName,
							commitMessage,
							stagePathspec,
							onCheckoutRestored,
						});
					}

					// Scope staging to the package while including removed entities.
					await git.add(['--all', '--', stagePathspec]);
					await git.commit(commitMessage);
					const commitSha = (await git.revparse(['HEAD'])).trim();

					if (force) {
						await git.push('origin', branchName, ['-f']);
					} else {
						await git.push('origin', branchName);
					}

					return { commitSha };
				},
			);
		} catch (error) {
			throw this.mapGitError(error, { configId, branchName: targetBranchName ?? branchName });
		}
	}

	/** Reset the checkout to the latest base branch before one branched promotion. */
	async prepareCheckoutForPromotion(operation: GitOperation): Promise<void> {
		const { remoteUrl, credentials, paths, branchName, configId } = operation;
		try {
			await this.withGit(
				{ remoteUrl, credentials, repoDir: paths.repositoryFolder, sshDir: paths.sshDir },
				async (git) => {
					const branchRefs = await git.listRemote([
						'--heads',
						'origin',
						`refs/heads/${branchName}`,
					]);
					if (!branchRefs.trim()) {
						throw new BadRequestError(`Remote branch does not exist: ${branchName}`);
					}

					await git.fetch('origin', `+refs/heads/${branchName}:refs/remotes/origin/${branchName}`, [
						'--progress',
					]);
					await git.raw(['reset', '--hard', `origin/${branchName}`]);
				},
			);
		} catch (error) {
			throw this.mapGitError(error, { configId, branchName });
		}
	}

	/** Push one commit to a new branch and restore the local base branch. */
	private async commitAndPushToTargetBranch(
		git: SimpleGit,
		{
			branchName,
			targetBranchName,
			commitMessage,
			stagePathspec,
			onCheckoutRestored,
		}: {
			branchName: string;
			targetBranchName: string;
			commitMessage: string;
			stagePathspec: string;
			onCheckoutRestored: () => Promise<void>;
		},
	): Promise<{ commitSha: string }> {
		const preCommitHead = (
			await git.raw(['for-each-ref', '--format=%(objectname)', `refs/heads/${branchName}`])
		).trim();
		if (!preCommitHead) {
			throw new BadRequestError(`Local branch does not exist: ${branchName}`);
		}

		try {
			await git.add(['--all', '--', stagePathspec]);
			await git.commit(commitMessage);
			const commitSha = (await git.revparse(['HEAD'])).trim();
			await git.push('origin', `HEAD:refs/heads/${targetBranchName}`);
			return { commitSha };
		} finally {
			await this.restorePromotionBase(git, {
				branchName,
				targetBranchName,
				preCommitHead,
				onCheckoutRestored,
			});
		}
	}

	private async restorePromotionBase(
		git: SimpleGit,
		{
			branchName,
			targetBranchName,
			preCommitHead,
			onCheckoutRestored,
		}: {
			branchName: string;
			targetBranchName: string;
			preCommitHead: string;
			onCheckoutRestored: () => Promise<void>;
		},
	): Promise<void> {
		try {
			await git.raw(['reset', '--hard', preCommitHead]);
		} catch {
			this.logger.warn('Failed to restore Git checkout after promotion', {
				branchName,
				targetBranchName,
			});
			return;
		}

		try {
			await onCheckoutRestored();
		} catch {
			// The checkout is usable, but it stays untrusted until the next clone.
			this.logger.warn('Failed to trust the Git checkout after promotion', {
				branchName,
				targetBranchName,
			});
		}
	}

	private async fetchBranch({
		remoteUrl,
		credentials,
		paths,
		branchName,
	}: GitOperation): Promise<void> {
		await this.withGit(
			{ remoteUrl, credentials, repoDir: paths.repositoryFolder, sshDir: paths.sshDir },
			async (git) => {
				// --progress keeps the stall-timeout timer fed during a healthy transfer.
				await git.fetch('origin', `+refs/heads/${branchName}:refs/remotes/origin/${branchName}`, [
					'--progress',
				]);
			},
		);
	}

	async refreshCheckout(operation: GitOperation): Promise<{ commitSha: string }> {
		const { paths, branchName, configId } = operation;
		try {
			await this.fetchBranch(operation);
			const git = simpleGit({ ...BASE_GIT_OPTIONS, baseDir: paths.repositoryFolder });
			await git.raw(['reset', '--hard', `origin/${branchName}`]);
			return { commitSha: (await git.revparse(['HEAD'])).trim() };
		} catch (error) {
			throw this.mapGitError(error, { configId, branchName });
		}
	}

	async listBranchTree({
		pathspecs,
		...operation
	}: GitOperation & { pathspecs: string[] }): Promise<string> {
		const { remoteUrl, credentials, paths, branchName, configId } = operation;
		try {
			const git = simpleGit({ ...BASE_GIT_OPTIONS, baseDir: paths.repositoryFolder });
			try {
				await this.fetchBranch(operation);
			} catch (error) {
				const cached = await git.branch(['--remotes', '--list', `origin/${branchName}`]);
				if (cached.all.length > 0) throw error;

				const refs = await this.withGit(
					{ remoteUrl, credentials, repoDir: paths.repositoryFolder, sshDir: paths.sshDir },
					async (git) => await git.listRemote(['origin']),
				);
				if (!refs.trim()) return '';
				throw error;
			}
			return await git.raw([
				'ls-tree',
				'-r',
				'-z',
				`refs/remotes/origin/${branchName}`,
				'--',
				...pathspecs,
			]);
		} catch (error) {
			throw this.mapGitError(error, { configId, branchName });
		}
	}

	// Configure credentials per operation and remove temporary SSH key material afterwards.
	private async withGit<T>(
		{
			remoteUrl,
			credentials,
			repoDir,
			sshDir,
			config: extraConfig = [],
		}: {
			remoteUrl: string;
			credentials: PromotionGitCredentials;
			repoDir: string;
			sshDir: string;
			config?: string[];
		},
		operation: (git: SimpleGit) => Promise<T>,
	) {
		await mkdir(repoDir, { recursive: true });
		const options = {
			...BASE_GIT_OPTIONS,
			baseDir: repoDir,
			config: [...BASE_GIT_OPTIONS.config, ...extraConfig],
		};
		let temporaryFolder: string | undefined;

		try {
			let git: SimpleGit;
			if (credentials.authType === 'token') {
				const config = [...options.config, ...buildHttpsGitConfig({ repositoryUrl: remoteUrl })];

				git = simpleGit({
					...options,
					config,
					unsafe: { allowUnsafeCredentialHelper: true },
				})
					.env('GIT_TERMINAL_PROMPT', '0')
					.env('N8N_GIT_USERNAME', credentials.username)
					.env('N8N_GIT_PASSWORD', credentials.password);
			} else {
				temporaryFolder = await mkdtemp(path.join(tmpdir(), 'n8n-promotions-'));
				const privateKeyPath = path.join(temporaryFolder, 'private-key');
				await writeFile(privateKeyPath, credentials.privateKey, { mode: 0o600 });
				await chmod(privateKeyPath, 0o600);
				// Keep the host key outside the resettable checkout.
				await mkdir(sshDir, { recursive: true });
				const sshCommand = buildSshCommand({
					privateKeyPath,
					knownHostsPath: path.join(sshDir, 'known_hosts'),
				});
				git = simpleGit({
					...options,
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
	private mapGitError(error: unknown, ctx: { configId: string; branchName: string }): Error {
		if (error instanceof BadRequestError || error instanceof ServiceUnavailableError) return error;

		if (error instanceof GitPluginError && error.plugin === 'timeout') {
			this.logger.warn('Git operation stalled', ctx);
			return new ServiceUnavailableError('The Git operation timed out. Please try again.');
		}

		this.logger.warn('Git operation failed', ctx);
		return new BadRequestError('Could not complete the Git operation');
	}
}
