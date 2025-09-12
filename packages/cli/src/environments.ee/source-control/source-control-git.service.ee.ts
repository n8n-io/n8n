import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { execSync } from 'child_process';
import { existsSync, unlinkSync } from 'fs';
import { UnexpectedError } from 'n8n-workflow';
import path from 'path';
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

import { OwnershipService } from '@/services/ownership.service';

import {
	SOURCE_CONTROL_DEFAULT_BRANCH,
	SOURCE_CONTROL_DEFAULT_EMAIL,
	SOURCE_CONTROL_DEFAULT_NAME,
	SOURCE_CONTROL_ORIGIN,
} from './constants';
import { sourceControlFoldersExistCheck } from './source-control-helper.ee';
import { SourceControlPreferencesService } from './source-control-preferences.service.ee';
import type { SourceControlPreferences } from './types/source-control-preferences';

@Service()
export class SourceControlGitService {
	git: SimpleGit | null = null;

	private gitOptions: Partial<SimpleGitOptions> = {};

	private gitOperationInProgress = false;

	private gitFolder = '';

	constructor(
		private readonly logger: Logger,
		private readonly ownershipService: OwnershipService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
	) {}

	/**
	 * Clean up git lock files that may be left behind by crashed git processes
	 */
	private async cleanupGitLockFiles(): Promise<void> {
		if (!this.gitFolder) return;

		const lockFiles = [
			path.join(this.gitFolder, '.git', 'index.lock'),
			path.join(this.gitFolder, '.git', 'HEAD.lock'),
			path.join(this.gitFolder, '.git', 'config.lock'),
			path.join(this.gitFolder, '.git', 'objects', 'info', 'alternates.lock'),
			path.join(this.gitFolder, '.git', 'refs', 'heads'),
			path.join(this.gitFolder, '.git', 'refs', 'remotes'),
		];

		for (const lockPattern of lockFiles) {
			try {
				// Handle directory patterns for ref locks
				if (lockPattern.includes('refs')) {
					if (existsSync(lockPattern)) {
						const { readdirSync } = await import('fs');
						const cleanDir = async (dirPath: string): Promise<void> => {
							try {
								const files = readdirSync(dirPath, { withFileTypes: true });
								for (const file of files) {
									const fullPath = path.join(dirPath, file.name);
									if (file.isDirectory()) {
										await cleanDir(fullPath);
									} else if (file.name.endsWith('.lock')) {
										this.logger.debug(`Removing stale git lock file: ${fullPath}`);
										unlinkSync(fullPath);
									}
								}
							} catch (dirError) {
								this.logger.debug(
									`Could not clean directory ${dirPath}: ${(dirError as Error).message}`,
								);
							}
						};
						await cleanDir(lockPattern);
					}
				} else if (existsSync(lockPattern)) {
					this.logger.debug(`Removing stale git lock file: ${lockPattern}`);
					unlinkSync(lockPattern);
				}
			} catch (error) {
				this.logger.warn(`Failed to clean up git lock file ${lockPattern}`, { error });
			}
		}
	}

	/**
	 * Ensure only one git operation runs at a time to prevent lock conflicts
	 */
	private async acquireGitOperationLock(): Promise<void> {
		const maxWaitTime = 30000; // 30 seconds
		const startTime = Date.now();

		while (this.gitOperationInProgress) {
			if (Date.now() - startTime > maxWaitTime) {
				this.logger.warn('Git operation timeout - forcing unlock');
				this.gitOperationInProgress = false;
				break;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		this.gitOperationInProgress = true;
	}

	/**
	 * Release the git operation lock
	 */
	private releaseGitOperationLock(): void {
		this.gitOperationInProgress = false;
	}

	/**
	 * Verify git repository is in a good state and reinitialize if needed
	 */
	private async ensureGitRepositoryState(): Promise<void> {
		if (!this.git || !this.gitFolder) return;

		try {
			// Check if git directory exists and is valid
			const gitDir = path.join(this.gitFolder, '.git');
			const { existsSync } = await import('fs');

			if (!existsSync(gitDir)) {
				this.logger.debug('Git directory not found, reinitializing');
				await this.git.init();
				return;
			}

			// Try a basic git operation to verify repository state
			await this.git.status();
		} catch (error) {
			this.logger.warn('Git repository appears corrupted, attempting to fix', { error });

			try {
				// Clean up and reinitialize
				await this.cleanupGitLockFiles();

				const gitDir = path.join(this.gitFolder, '.git');
				const { existsSync } = await import('fs');

				if (existsSync(gitDir)) {
					const { rm } = await import('fs/promises');
					await rm(gitDir, { recursive: true, force: true });
				}

				// Reinitialize
				await this.git.init();
				this.logger.debug('Git repository state restored');

				// Reinitialize git command after repository recreation
				await this.setGitCommand();
			} catch (fixError) {
				this.logger.error('Failed to fix git repository state', { fixError });
				throw new UnexpectedError('Git repository is in an unusable state', { cause: fixError });
			}
		}
	}

	/**
	 * Execute a git operation with proper locking and error recovery
	 */
	private async executeGitOperation<T>(
		operation: () => Promise<T>,
		operationName: string,
		retries = 2,
	): Promise<T> {
		await this.acquireGitOperationLock();

		let lastError: Error | null = null;

		try {
			for (let attempt = 1; attempt <= retries + 1; attempt++) {
				try {
					this.logger.debug(`Executing git operation: ${operationName} (attempt ${attempt})`);
					const result = await operation();
					this.logger.debug(`Git operation completed successfully: ${operationName}`);
					return result;
				} catch (error) {
					lastError = error instanceof Error ? error : new Error(String(error));

					// Check if error is related to git lock files
					if (lastError.message.includes('index.lock') || lastError.message.includes('.lock')) {
						this.logger.warn(
							`Git lock file detected for operation ${operationName}, cleaning up and retrying`,
						);
						await this.cleanupGitLockFiles();
					}

					// Check if it's a "not a git repository" error
					if (lastError.message.includes('not a git repository')) {
						this.logger.warn(
							`Git repository not found for operation ${operationName}, attempting to reinitialize`,
						);
						if (this.git && this.gitFolder) {
							try {
								await this.git.init();
							} catch (initError) {
								this.logger.error('Failed to reinitialize git repository', { initError });
							}
						}
					}

					if (attempt < retries + 1) {
						// Wait before retrying (exponential backoff)
						const waitTime = Math.pow(2, attempt - 1) * 1000;
						this.logger.debug(`Waiting ${waitTime}ms before retry`);
						await new Promise((resolve) => setTimeout(resolve, waitTime));
					} else {
						this.logger.error(
							`Git operation failed after ${retries + 1} attempts: ${operationName}`,
							{ error: lastError },
						);
					}
				}
			}

			throw lastError;
		} finally {
			this.releaseGitOperationLock();
		}
	}

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

		this.gitFolder = gitFolder;

		this.preInitCheck();
		this.logger.debug('Git pre-check passed');

		sourceControlFoldersExistCheck([gitFolder, sshFolder]);

		// Clean up any stale git lock files before initializing
		await this.cleanupGitLockFiles();

		await this.setGitCommand(gitFolder, sshFolder);

		if (!(await this.checkRepositorySetup())) {
			try {
				await (this.git as unknown as SimpleGit).init();
			} catch (error) {
				const errorMessage = (error as Error).message;

				// Handle common git init issues
				if (errorMessage.includes('File exists') || errorMessage.includes('already exists')) {
					this.logger.debug('Git repository already exists, attempting to reinitialize');

					// Try to clean up and reinitialize
					try {
						// Clean up lock files first
						await this.cleanupGitLockFiles();

						// Remove .git directory and reinitialize
						const gitDir = path.join(this.gitFolder, '.git');
						const { existsSync } = await import('fs');

						if (existsSync(gitDir)) {
							// Wait a bit for any running git operations to finish
							await new Promise((resolve) => setTimeout(resolve, 500));

							const { rm } = await import('fs/promises');
							await rm(gitDir, { recursive: true, force: true });
						}

						// Ensure the git folder exists
						const { mkdir } = await import('fs/promises');
						await mkdir(this.gitFolder, { recursive: true });

						// Try init again
						await (this.git as unknown as SimpleGit).init();
						this.logger.debug('Git repository reinitialized successfully');
					} catch (reinitError) {
						this.logger.error('Failed to reinitialize git repository', { error: reinitError });
						throw new UnexpectedError('Could not initialize git repository after cleanup', {
							cause: reinitError,
						});
					}
				} else {
					this.logger.error('Git init failed', { error });
					throw new UnexpectedError('Failed to initialize git repository', { cause: error });
				}
			}
		}
		if (!(await this.hasRemote(sourceControlPreferences.repositoryUrl))) {
			if (sourceControlPreferences.connected && sourceControlPreferences.repositoryUrl) {
				const instanceOwner = await this.ownershipService.getInstanceOwner();
				await this.initRepository(sourceControlPreferences, instanceOwner);
			}
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
			maxConcurrentProcesses: 6,
			trimmed: false,
		};

		const { simpleGit } = await import('simple-git');

		if (preferences.connectionType === 'https') {
			this.git = simpleGit(this.gitOptions).env('GIT_TERMINAL_PROMPT', '0');
		} else {
			const privateKeyPath = await this.sourceControlPreferencesService.getPrivateKeyPath();
			const sshKnownHosts = path.join(sshFolder, 'known_hosts');

			// Convert paths to POSIX format for SSH command (works cross-platform)
			// Use regex to handle both Windows (\) and POSIX (/) separators regardless of current platform
			const normalizedPrivateKeyPath = privateKeyPath.split(/[/\\]/).join('/');
			const normalizedKnownHostsPath = sshKnownHosts.split(/[/\\]/).join('/');

			// Escape double quotes to prevent command injection
			const escapedPrivateKeyPath = normalizedPrivateKeyPath.replace(/"/g, '\\"');
			const escapedKnownHostsPath = normalizedKnownHostsPath.replace(/"/g, '\\"');

			// Quote paths to handle spaces and special characters
			const sshCommand = `ssh -o UserKnownHostsFile="${escapedKnownHostsPath}" -o StrictHostKeyChecking=no -i "${escapedPrivateKeyPath}"`;

			this.git = simpleGit(this.gitOptions)
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
			const foundRemote = remotes.find((e) => {
				if (e.name !== SOURCE_CONTROL_ORIGIN) return false;

				// Normalize URLs by removing credentials to safely compare HTTPS URLs
				// that may contain username/password authentication details
				const normalizeUrl = (url: string) => {
					try {
						const urlObj = new URL(url);
						urlObj.username = '';
						urlObj.password = '';
						return urlObj.toString();
					} catch {
						return url;
					}
				};

				const remoteNormalized = normalizeUrl(e.refs.push);
				const inputNormalized = normalizeUrl(remote);

				return remoteNormalized === inputNormalized;
			});

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

	private async getAuthorizedHttpsRepositoryUrl(
		repositoryUrl: string,
		connectionType: string | undefined,
	): Promise<string> {
		if (connectionType !== 'https') {
			return repositoryUrl;
		}

		this.logger.debug('Attempting to get HTTPS credentials for repository URL authorization');

		const credentials = await this.sourceControlPreferencesService.getDecryptedHttpsCredentials();
		if (!credentials) {
			this.logger.error('HTTPS connection type specified but no credentials found in database');
			throw new UnexpectedError(
				'HTTPS connection type specified but no credentials found. Please ensure you have saved your username and Personal Access Token in the source control settings.',
			);
		}

		try {
			const urlObj = new URL(repositoryUrl);
			urlObj.username = encodeURIComponent(credentials.username);
			urlObj.password = encodeURIComponent(credentials.password);

			this.logger.debug('Successfully authorized HTTPS repository URL');
			return urlObj.toString();
		} catch (error) {
			this.logger.error('Failed to construct authorized HTTPS URL', {
				error,
				repositoryUrl: repositoryUrl.replace(/\/\/.*@/, '//***@'), // Mask any existing credentials in logs
			});
			throw new UnexpectedError('Failed to construct authorized repository URL', { cause: error });
		}
	}

	async initRepository(
		sourceControlPreferences: Pick<
			SourceControlPreferences,
			'repositoryUrl' | 'branchName' | 'initRepo' | 'connectionType'
		>,
		user: User,
	): Promise<void> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (Promise)');
		}

		// Ensure git repository is in a good state before proceeding
		await this.ensureGitRepositoryState();
		if (sourceControlPreferences.initRepo) {
			try {
				await this.git.init();
			} catch (error) {
				this.logger.debug(`Git init: ${(error as Error).message}`);
			}
		}

		const repositoryUrl = await this.getAuthorizedHttpsRepositoryUrl(
			sourceControlPreferences.repositoryUrl,
			sourceControlPreferences.connectionType,
		);

		await this.executeGitOperation(async () => {
			try {
				await this.git!.addRemote(SOURCE_CONTROL_ORIGIN, repositoryUrl);
				this.logger.debug(`Git remote added: ${sourceControlPreferences.repositoryUrl}`);
			} catch (error) {
				if ((error as Error).message.includes('remote origin already exists')) {
					this.logger.debug(`Git remote already exists: ${(error as Error).message}`);
					// Remove existing remote and add new one
					try {
						await this.git!.removeRemote(SOURCE_CONTROL_ORIGIN);
						await this.git!.addRemote(SOURCE_CONTROL_ORIGIN, repositoryUrl);
						this.logger.debug(`Git remote updated: ${sourceControlPreferences.repositoryUrl}`);
					} catch (updateError) {
						this.logger.warn('Failed to update existing remote', { updateError });
						// Continue anyway
					}
				} else {
					throw error;
				}
			}
		}, 'addRemote');
		await this.setGitUserDetails(
			user.firstName && user.lastName
				? `${user.firstName} ${user.lastName}`
				: SOURCE_CONTROL_DEFAULT_NAME,
			user.email ?? SOURCE_CONTROL_DEFAULT_EMAIL,
		);

		await this.trackRemoteIfReady(sourceControlPreferences.branchName);
	}

	/**
	 * If this is a new local repository being set up after remote is ready,
	 * then set this local to start tracking remote's target branch.
	 */
	private async trackRemoteIfReady(targetBranch: string) {
		if (!this.git) return;

		try {
			await this.fetch();
		} catch (fetchError) {
			this.logger.debug('Fetch failed during trackRemoteIfReady, continuing', { fetchError });
			// Continue - the remote might not exist yet
		}

		try {
			const { currentBranch, branches: remoteBranches } = await this.getBranches();

			if (!currentBranch && remoteBranches.some((b) => b === targetBranch)) {
				// Create and checkout the branch to track the remote
				await this.executeGitOperation(async () => {
					await this.git!.checkout([
						'-b',
						targetBranch,
						`${SOURCE_CONTROL_ORIGIN}/${targetBranch}`,
					]);
				}, 'checkout-remote-branch');

				this.logger.info('Set local git repository to track remote', {
					branch: targetBranch,
					remote: `${SOURCE_CONTROL_ORIGIN}/${targetBranch}`,
				});
			} else if (!currentBranch && remoteBranches.length === 0) {
				// No remote branches exist, create initial branch
				try {
					await this.executeGitOperation(async () => {
						// Create an initial commit if needed
						const status = await this.git!.status();
						if (status.files.length === 0) {
							// Create an initial file to make a commit possible
							const { writeFile } = await import('fs/promises');
							const readmePath = path.join(this.gitFolder, 'README.md');
							await writeFile(
								readmePath,
								'# Repository\n\nThis is an n8n source control repository.\n',
							);
							await this.git!.add('README.md');
							await this.git!.commit('Initial commit');
						}

						// Now create/rename the branch
						await this.git!.raw(['branch', '-M', targetBranch]);
					}, 'create-initial-branch');

					this.logger.debug(`Created initial branch: ${targetBranch}`);
				} catch (branchError) {
					this.logger.debug(`Failed to create initial branch: ${(branchError as Error).message}`);
					// Continue anyway
				}
			}
		} catch (error) {
			this.logger.debug('Branch tracking setup failed, continuing', { error });
			// Continue - we'll handle this later when operations are performed
		}
	}

	async setGitUserDetails(name: string, email: string): Promise<void> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (setGitUserDetails)');
		}

		await this.executeGitOperation(async () => {
			await this.git!.addConfig('user.email', email);
			await this.git!.addConfig('user.name', name);
		}, 'setGitUserDetails');
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

		return await this.executeGitOperation(async () => {
			try {
				// Try to checkout existing branch first
				await this.git!.checkout(branch);
			} catch (checkoutError) {
				const errorMessage = (checkoutError as Error).message;

				// If branch doesn't exist, check if remote branch exists
				if (errorMessage.includes('pathspec') || errorMessage.includes('did not match')) {
					try {
						const { branches: remoteBranches } = await this.getBranches();

						if (remoteBranches.some((b) => b === branch)) {
							// Remote branch exists, create local tracking branch
							await this.git!.checkout(['-b', branch, `${SOURCE_CONTROL_ORIGIN}/${branch}`]);
						} else {
							// Neither local nor remote branch exists, create new branch
							await this.git!.checkout(['-b', branch]);
						}
					} catch (branchError) {
						this.logger.error('Failed to create or checkout branch', { branch, branchError });
						throw branchError;
					}
				} else {
					throw checkoutError;
				}
			}

			// Set upstream if remote branch exists
			try {
				await this.git!.branch([`--set-upstream-to=${SOURCE_CONTROL_ORIGIN}/${branch}`, branch]);
			} catch (upstreamError) {
				this.logger.debug('Could not set upstream (remote branch may not exist)', {
					upstreamError,
				});
				// Continue without upstream - this is OK for new branches
			}

			return await this.getBranches();
		}, 'setBranch');
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

		return await this.executeGitOperation(async () => await this.git!.fetch(), 'fetch');
	}

	async pull(options: { ffOnly: boolean } = { ffOnly: true }): Promise<PullResult> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (pull)');
		}
		await this.setGitCommand();

		return await this.executeGitOperation(async () => {
			const params = {};
			if (options.ffOnly) {
				Object.assign(params, { '--ff-only': true });
			}
			return await this.git!.pull(params);
		}, 'pull');
	}

	async push(
		options: { force: boolean; branch: string } = {
			force: false,
			branch: SOURCE_CONTROL_DEFAULT_BRANCH,
		},
	): Promise<PushResult> {
		const { force, branch } = options;
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (push)');
		}
		await this.setGitCommand();

		return await this.executeGitOperation(async () => {
			if (force) {
				return await this.git!.push(SOURCE_CONTROL_ORIGIN, branch, ['-f']);
			}
			return await this.git!.push(SOURCE_CONTROL_ORIGIN, branch);
		}, 'push');
	}

	async stage(files: Set<string>, deletedFiles?: Set<string>): Promise<string> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (stage)');
		}

		return await this.executeGitOperation(async () => {
			if (deletedFiles?.size) {
				try {
					await this.git!.rm(Array.from(deletedFiles));
				} catch (error) {
					this.logger.debug(`Git rm: ${(error as Error).message}`);
				}
			}

			// Filter out files that don't exist to prevent pathspec errors
			const existingFiles = [];
			const { existsSync } = await import('fs');

			for (const file of Array.from(files)) {
				if (existsSync(file)) {
					existingFiles.push(file);
				} else {
					this.logger.debug(`Skipping non-existent file during staging: ${file}`);
				}
			}

			if (existingFiles.length === 0) {
				this.logger.debug('No existing files to stage');
				return '';
			}

			return await this.git!.add(existingFiles);
		}, 'stage');
	}

	async resetBranch(
		options: { hard: boolean; target: string } = { hard: true, target: 'HEAD' },
	): Promise<string> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (Promise)');
		}
		if (options?.hard) {
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

		return await this.executeGitOperation(async () => await this.git!.commit(message), 'commit');
	}

	async status(): Promise<StatusResult> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (status)');
		}

		return await this.executeGitOperation(async () => await this.git!.status(), 'status');
	}

	async getFileContent(filePath: string, commit: string = 'HEAD'): Promise<string> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (getFileContent)');
		}
		try {
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
