import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { execSync } from 'child_process';
import { UnexpectedError, UserError } from 'n8n-workflow';
import * as path from 'path';
import type {
	CommitResult,
	DiffResult,
	FetchResult,
	PullResult,
	PushResult,
	SimpleGit,
	SimpleGitOptions,
	StatusResult,
} from 'simple-git';

import { buildHttpsGitConfig, buildSshCommand } from '@/modules/promotions.ee/promotions-git.utils';
import { OwnershipService } from '@/services/ownership.service';

import {
	SOURCE_CONTROL_DEFAULT_BRANCH,
	SOURCE_CONTROL_DEFAULT_EMAIL,
	SOURCE_CONTROL_DEFAULT_NAME,
	SOURCE_CONTROL_MANAGED_DIRECTORIES,
	SOURCE_CONTROL_MANAGED_PATHS,
	SOURCE_CONTROL_ORIGIN,
} from './constants';
import { sourceControlFoldersExistCheck } from './source-control-helper.ee';
import { SourceControlPreferencesService } from './source-control-preferences.service.ee';
import type { SourceControlPreferences } from './types/source-control-preferences';

/**
 * Service for interacting with locally cloned git repositories.
 *
 * For local development:
 * Keep in mind that when running n8n locally using a pnpm dev script,
 * the git credentials on your machine will be picked up by the git client
 * used in this service.
 * See the README for the environments feature for instructions to run n8n in a docker container.
 */
@Service()
export class SourceControlGitService {
	git: SimpleGit | null = null;

	private gitOptions: Partial<SimpleGitOptions> = {};

	constructor(
		private readonly logger: Logger,
		private readonly ownershipService: OwnershipService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
	) {}

	/**
	 * Run pre-checks before initialising git
	 * Checks for existence of required binaries (git and ssh)
	 */
	private preInitCheck(): boolean {
		this.logger.debug('GitService.preCheck');
		try {
			const gitResult = execSync('git --version', {
				stdio: ['pipe', 'pipe', 'pipe'],
			});
			this.logger.debug(`Git binary found: ${gitResult.toString()}`);
		} catch (error) {
			this.logger.error('Git binary check failed', { error });
			throw new UnexpectedError('Git binary not found', { cause: error });
		}
		try {
			const sshResult = execSync('ssh -V', {
				stdio: ['pipe', 'pipe', 'pipe'],
			});
			this.logger.debug(`SSH binary found: ${sshResult.toString()}`);
		} catch (error) {
			this.logger.error('SSH binary check failed', { error });
			throw new UnexpectedError('SSH binary not found', { cause: error });
		}
		return true;
	}

	async initService(options: {
		sourceControlPreferences: SourceControlPreferences;
		gitFolder: string;
		sshFolder: string;
		sshKeyName: string;
	}): Promise<void> {
		const { sourceControlPreferences: sourceControlPreferences, gitFolder, sshFolder } = options;
		this.logger.debug('GitService.init');
		if (this.git !== null) {
			return;
		}

		this.preInitCheck();
		this.logger.debug('Git pre-check passed');

		sourceControlFoldersExistCheck([gitFolder, sshFolder]);

		await this.setGitCommand(gitFolder, sshFolder);

		if (!(await this.checkRepositorySetup())) {
			await (this.git as unknown as SimpleGit).init();
		}
		if (!(await this.hasRemote(sourceControlPreferences.repositoryUrl))) {
			if (sourceControlPreferences.connected && sourceControlPreferences.repositoryUrl) {
				const instanceOwner = await this.ownershipService.getInstanceOwner();
				await this.initRepository(sourceControlPreferences, instanceOwner, {
					tolerateTrackingFetchFailure: true,
				});
			}
		}

		// Ensure local repo is on the correct branch before operations in multi-main setups.
		if (sourceControlPreferences.connected && sourceControlPreferences.branchName) {
			await this.ensureBranchSetup(sourceControlPreferences.branchName);
		}
	}

	async setGitCommand(
		gitFolder = this.sourceControlPreferencesService.gitFolder,
		sshFolder = this.sourceControlPreferencesService.sshFolder,
	) {
		const preferences = this.sourceControlPreferencesService.getPreferences();

		this.gitOptions = {
			baseDir: gitFolder,
			binary: 'git',
			config: ['core.symlinks=false'],
			maxConcurrentProcesses: 6,
			trimmed: false,
		};

		const { simpleGit } = await import('simple-git');

		if (preferences.connectionType === 'https') {
			const credentials = await this.sourceControlPreferencesService.getDecryptedHttpsCredentials();
			const config = [
				...(this.gitOptions.config ?? []),
				...buildHttpsGitConfig({ repositoryUrl: preferences.repositoryUrl }),
			];
			const httpsGitOptions = {
				...this.gitOptions,
				config,
				unsafe: { allowUnsafeCredentialHelper: true },
				allowEnvironment: ['GIT_TERMINAL_PROMPT'],
			};

			this.git = simpleGit(httpsGitOptions)
				.env('GIT_TERMINAL_PROMPT', '0')
				.env('N8N_GIT_USERNAME', credentials.username)
				.env('N8N_GIT_PASSWORD', credentials.password);
		} else if (preferences.connectionType === 'ssh') {
			const privateKeyPath = await this.sourceControlPreferencesService.getPrivateKeyPath();
			const sshCommand = buildSshCommand({
				privateKeyPath,
				knownHostsPath: path.join(sshFolder, 'known_hosts'),
			});

			// Allow GIT_SSH_COMMAND so we can point SSH at n8n's own private key and known_hosts.
			// This is safe because the command is constructed internally above, not from user input.
			this.git = simpleGit({
				...this.gitOptions,
				unsafe: { allowUnsafeSshCommand: true },
				allowEnvironment: ['GIT_SSH_COMMAND', 'GIT_TERMINAL_PROMPT'],
			})
				.env('GIT_SSH_COMMAND', sshCommand)
				.env('GIT_TERMINAL_PROMPT', '0');
		}
	}

	resetService() {
		this.git = null;
	}

	private async checkRepositorySetup(): Promise<boolean> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (async)');
		}
		if (!(await this.git.checkIsRepo())) {
			return false;
		}
		try {
			await this.git.status();
			return true;
		} catch (error) {
			return false;
		}
	}

	private async hasRemote(remote: string): Promise<boolean> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (async)');
		}
		try {
			const remotes = await this.git.getRemotes(true);
			const foundRemote = remotes.find(
				(e) => e.name === SOURCE_CONTROL_ORIGIN && e.refs.push === remote,
			);

			if (foundRemote) {
				this.logger.debug(`Git remote found: ${foundRemote.name}: ${foundRemote.refs.push}`);
				return true;
			}
		} catch (error) {
			this.logger.error('Git remote check failed', { error });
			throw new UnexpectedError('Git is not initialized', { cause: error });
		}
		this.logger.debug(`Git remote not found: ${remote}`);
		return false;
	}

	async initRepository(
		sourceControlPreferences: Pick<
			SourceControlPreferences,
			'repositoryUrl' | 'branchName' | 'initRepo' | 'connectionType'
		>,
		user: User,
		options?: { tolerateTrackingFetchFailure?: boolean },
	): Promise<void> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (Promise)');
		}
		const { branchName, initRepo, repositoryUrl } = sourceControlPreferences;

		if (initRepo) {
			try {
				await this.git.init();
			} catch (error) {
				this.logger.debug(`Git init: ${(error as Error).message}`);
			}
		}

		try {
			await this.git.addRemote(SOURCE_CONTROL_ORIGIN, repositoryUrl);
			this.logger.debug(`Git remote added: ${repositoryUrl}`);
		} catch (error) {
			if ((error as Error).message.includes('remote origin already exists')) {
				this.logger.debug(`Git remote already exists: ${(error as Error).message}`);
			} else {
				throw error;
			}
		}
		await this.setGitUserDetails(
			user.firstName && user.lastName
				? `${user.firstName} ${user.lastName}`
				: SOURCE_CONTROL_DEFAULT_NAME,
			user.email ?? SOURCE_CONTROL_DEFAULT_EMAIL,
		);

		await this.trackRemoteIfReady(branchName, options?.tolerateTrackingFetchFailure);

		if (initRepo) {
			try {
				const branches = await this.getBranches();
				if (branches.branches?.length === 0) {
					await this.git.raw(['branch', '-M', branchName]);
				}
			} catch (error) {
				this.logger.debug(`Git init: ${(error as Error).message}`);
			}
		}
	}

	/**
	 * If this is a new local repository being set up after remote is ready,
	 * then set this local to start tracking remote's target branch.
	 */
	private async trackRemoteIfReady(targetBranch: string, tolerateFetchFailure: boolean = false) {
		if (!this.git) return;

		try {
			await this.fetch();
		} catch (error) {
			if (!tolerateFetchFailure) {
				throw error;
			}
			this.logger.warn('Failed to fetch during remote tracking setup', { error });
			return; // Don't fail startup initialization for recoverable remote issues
		}

		const { currentBranch, branches: remoteBranches } = await this.getBranches();

		if (!currentBranch && remoteBranches.some((b) => b === targetBranch)) {
			await this.setBranch(targetBranch);
			this.logger.info('Set local git repository to track remote', { targetBranch });
		}
	}

	/**
	 * Ensures the local repository is properly tracking the configured branch.
	 * This handles recovery scenarios where source control is connected in DB
	 * but local git state is incomplete (common in multi-main deployments).
	 */
	private async ensureBranchSetup(targetBranch: string): Promise<void> {
		if (!this.git) return;

		const { current: currentBranch } = await this.git.branch();

		// If already on the correct branch, nothing to do
		if (currentBranch === targetBranch) {
			return;
		}

		// Fetch to ensure we have remote refs
		try {
			await this.fetch();
		} catch (error) {
			this.logger.warn('Failed to fetch during branch setup recovery', { error });
			return; // Don't fail initialization, let sanityCheck handle errors
		}

		const { branches: remoteBranches } = await this.getBranches();

		// If the target branch exists on remote, check it out
		if (remoteBranches.includes(targetBranch)) {
			try {
				await this.setBranch(targetBranch);
				this.logger.info('Recovered source control branch setup', { targetBranch });
			} catch (error) {
				this.logger.warn('Failed to checkout branch during recovery', { targetBranch, error });
			}
		}
	}

	async setGitUserDetails(name: string, email: string): Promise<void> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (setGitUserDetails)');
		}
		await this.git.addConfig('user.email', email);
		await this.git.addConfig('user.name', name);
	}

	async getBranches(): Promise<{ branches: string[]; currentBranch: string }> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (getBranches)');
		}

		try {
			// Get remote branches
			const { branches } = await this.git.branch(['-r']);
			const remoteBranches = Object.keys(branches)
				.map((name) => name.split('/').slice(1).join('/'))
				.filter((name) => name !== 'HEAD');

			const { current } = await this.git.branch();

			return {
				branches: remoteBranches,
				currentBranch: current,
			};
		} catch (error) {
			this.logger.error('Failed to get branches', { error });
			throw new UnexpectedError('Could not get remote branches from repository', { cause: error });
		}
	}

	async setBranch(branch: string): Promise<{ branches: string[]; currentBranch: string }> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (setBranch)');
		}

		const { commit } = await this.fetchAndValidateRemoteCommit(branch);
		await this.git.raw(['checkout', '-B', branch, commit]);
		await this.git.branch([`--set-upstream-to=${SOURCE_CONTROL_ORIGIN}/${branch}`, branch]);
		return await this.getBranches();
	}

	async getCurrentBranch(): Promise<{ current: string; remote: string }> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (getCurrentBranch)');
		}
		const currentBranch = (await this.git.branch()).current;
		return {
			current: currentBranch,
			remote: 'origin/' + currentBranch,
		};
	}

	async diffRemote(): Promise<DiffResult | undefined> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (diffRemote)');
		}
		const currentBranch = await this.getCurrentBranch();
		if (currentBranch.remote) {
			const target = currentBranch.remote;
			return await this.git.diffSummary(['...' + target, '--ignore-all-space']);
		}
		return;
	}

	async diffLocal(): Promise<DiffResult | undefined> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (diffLocal)');
		}
		const currentBranch = await this.getCurrentBranch();
		if (currentBranch.remote) {
			const target = currentBranch.current;
			return await this.git.diffSummary([target, '--ignore-all-space']);
		}
		return;
	}

	async fetch(): Promise<FetchResult> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (fetch)');
		}
		await this.setGitCommand();
		return await this.git.fetch();
	}

	/**
	 * Reject a remote commit whose managed paths would materialize the wrong shape
	 * before applying it. Each managed path is either a directory or a regular file;
	 * a directory placed at a file path (or the reverse) passes a naive recursive
	 * scan but breaks the next import/export, so validate the direct entries too.
	 */
	private async assertManagedTreeContainsOnlyRegularFiles(ref: string): Promise<void> {
		if (!this.git) {
			throw new UnexpectedError(
				'Git is not initialized (assertManagedTreeContainsOnlyRegularFiles)',
			);
		}

		// 1. Validate the shape of each direct managed entry. `ls-tree` without `-r`
		//    reports the entry itself, so a directory reads as `tree` and a file as
		//    `blob` instead of being flattened into its contents.
		const directShapes = await this.git.raw([
			'ls-tree',
			'-z',
			'--full-tree',
			ref,
			'--',
			...SOURCE_CONTROL_MANAGED_PATHS,
		]);
		const managedDirectories: readonly string[] = SOURCE_CONTROL_MANAGED_DIRECTORIES;
		for (const entry of this.parseTreeEntries(directShapes)) {
			let reason: string | undefined;
			if (entry.malformed) {
				reason = 'Git returned malformed tree metadata';
			} else if (managedDirectories.includes(entry.filePath)) {
				if (entry.objectType !== 'tree') {
					reason = `Managed path ${entry.filePath} must be a directory`;
				}
			} else {
				reason = this.regularFileRejectionReason(entry);
			}
			if (reason) this.rejectUnsupportedEntry(entry.filePath, reason);
		}

		// 2. Validate that every entry inside the managed directories is a regular
		//    file. Recursion here lists leaf blobs only, so symlinks and submodules
		//    at any depth are rejected.
		const directoryContents = await this.git.raw([
			'ls-tree',
			'-r',
			'-z',
			'--full-tree',
			ref,
			'--',
			...SOURCE_CONTROL_MANAGED_DIRECTORIES,
		]);
		for (const entry of this.parseTreeEntries(directoryContents)) {
			const reason = entry.malformed
				? 'Git returned malformed tree metadata'
				: this.regularFileRejectionReason(entry);
			if (reason) this.rejectUnsupportedEntry(entry.filePath, reason);
		}
	}

	/** Parse NUL-delimited `ls-tree -z` output into entries. Paths can contain tabs and newlines. */
	private parseTreeEntries(output: string) {
		return output
			.split('\0')
			.filter((entry) => entry.length > 0)
			.map((entry) => {
				const separatorIndex = entry.indexOf('\t');
				const metadata = separatorIndex === -1 ? entry : entry.slice(0, separatorIndex);
				const filePath = separatorIndex === -1 ? '<unknown>' : entry.slice(separatorIndex + 1);
				const [mode, objectType, objectId, ...unexpectedMetadata] = metadata.split(' ');

				const malformed =
					separatorIndex === -1 ||
					!mode ||
					!objectType ||
					!objectId ||
					unexpectedMetadata.length > 0;

				return { mode, objectType, objectId, filePath, malformed };
			});
	}

	/** Return why a tree entry is not a supported regular file, or undefined if it is. */
	private regularFileRejectionReason(entry: {
		mode: string;
		objectType: string;
	}): string | undefined {
		if (entry.objectType !== 'blob') {
			return `Git object type ${entry.objectType} is not supported`;
		}
		if (entry.mode !== '100644' && entry.mode !== '100755') {
			// 120000 = symlink; other modes are special git objects
			return `Git file mode ${entry.mode} is not supported`;
		}
		return undefined;
	}

	private rejectUnsupportedEntry(filePath: string, reason: string): never {
		this.logger.error('Remote source control tree contains an unsupported managed entry', {
			filePath,
			reason,
		});
		throw new UserError(
			'The remote repository contains an unsupported source control entry. Update the repository and try again.',
		);
	}

	private async fetchAndValidateRemoteCommit(
		branch?: string,
	): Promise<{ branch: string; commit: string }> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (fetchAndValidateRemoteCommit)');
		}

		await this.fetch();

		const resolvedBranch = branch ?? (await this.git.branch()).current;
		if (!resolvedBranch) {
			throw new UserError('The source control branch is not configured.');
		}

		const remoteRef = `refs/remotes/${SOURCE_CONTROL_ORIGIN}/${resolvedBranch}`;
		const commit = (await this.git.raw(['rev-parse', '--verify', `${remoteRef}^{commit}`])).trim();
		await this.assertManagedTreeContainsOnlyRegularFiles(commit);

		return { branch: resolvedBranch, commit };
	}

	async pull(options: { ffOnly: boolean } = { ffOnly: true }): Promise<PullResult> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (pull)');
		}

		// Split pull into fetch + merge so the remote tree can be validated before it touches disk.
		const { commit } = await this.fetchAndValidateRemoteCommit();
		return await this.git.merge([...(options.ffOnly ? ['--ff-only'] : []), commit]);
	}

	async push(
		options: { force: boolean; branch: string } = {
			force: false,
			branch: SOURCE_CONTROL_DEFAULT_BRANCH,
		},
	): Promise<PushResult> {
		const { force, branch } = options;
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized ({)');
		}
		await this.setGitCommand();
		if (force) {
			return await this.git.push(SOURCE_CONTROL_ORIGIN, branch, ['-f']);
		}
		return await this.git.push(SOURCE_CONTROL_ORIGIN, branch);
	}

	async stage(files: Set<string>, deletedFiles?: Set<string>): Promise<string> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (stage)');
		}
		if (deletedFiles?.size) {
			try {
				await this.git.rm(Array.from(deletedFiles));
			} catch (error) {
				this.logger.debug(`Git rm: ${(error as Error).message}`);
			}
		}
		return await this.git.add(Array.from(files));
	}

	async resetBranch(
		options: { hard: boolean; target: string } = { hard: true, target: 'HEAD' },
	): Promise<string> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (Promise)');
		}
		if (options?.hard) {
			// A remote target writes remote content onto disk, so it needs the same validation as
			// pull; a local target (e.g. HEAD) does not.
			const remotePrefix = `${SOURCE_CONTROL_ORIGIN}/`;
			if (options.target.startsWith(remotePrefix)) {
				const branch = options.target.slice(remotePrefix.length);
				// Reset to the validated SHA, not the ref, so the ref can't move between validation
				// and reset.
				const { commit } = await this.fetchAndValidateRemoteCommit(branch);
				return await this.git.raw(['reset', '--hard', commit]);
			}
			return await this.git.raw(['reset', '--hard', options.target]);
		}
		return await this.git.raw(['reset', options.target]);
		// built-in reset method does not work
		// return this.git.reset();
	}

	async commit(message: string): Promise<CommitResult> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (commit)');
		}
		return await this.git.commit(message);
	}

	async status(): Promise<StatusResult> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (status)');
		}
		const statusResult = await this.git.status();
		return statusResult;
	}

	async getFileContent(filePath: string, commit: string = 'HEAD'): Promise<string> {
		try {
			if (!this.git) {
				throw new UnexpectedError('Git is not initialized (getFileContent)');
			}
			const content = await this.git.show([`${commit}:${filePath}`]);
			return content;
		} catch (error) {
			this.logger.error('Failed to get file content', { filePath, error });
			throw new UnexpectedError(
				`Could not get content for file: ${filePath}: ${(error as Error)?.message}`,
				{ cause: error },
			);
		}
	}
}
