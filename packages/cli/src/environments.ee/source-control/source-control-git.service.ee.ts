import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { execSync } from 'child_process';
import { rm as fsRm } from 'fs/promises';
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

	// Security: Track temporary files for cleanup
	private tempFiles = new Set<string>();

	// Security: Track sensitive environment variables for cleanup
	private sensitiveEnvVars = new Set<string>();

	// Security: Track if cleanup handlers are registered (static to avoid multiple registrations)
	private static cleanupHandlersRegistered = false;

	// Security: Track all service instances for global cleanup
	private static serviceInstances = new Set<SourceControlGitService>();

	constructor(
		private readonly logger: Logger,
		private readonly ownershipService: OwnershipService,
		private readonly sourceControlPreferencesService: SourceControlPreferencesService,
	) {
		// Security: Add this instance to the global set and register cleanup handlers
		SourceControlGitService.serviceInstances.add(this);
		this.registerCleanupHandlers();
	}

	/**
	 * Security: Register process exit handlers to ensure cleanup of temporary files and sensitive data
	 */
	private registerCleanupHandlers(): void {
		if (SourceControlGitService.cleanupHandlersRegistered) return;

		const cleanup = async () => {
			try {
				// Clean up all service instances
				for (const instance of SourceControlGitService.serviceInstances) {
					await instance.cleanup();
				}
			} catch (error) {
				console.error('Failed to cleanup SourceControlGitService during process exit', error);
			}
		};

		// Register handlers for various exit scenarios
		process.on('exit', () => {
			// Synchronous cleanup only - async operations won't work in 'exit' event
			for (const instance of SourceControlGitService.serviceInstances) {
				instance.cleanupSync();
			}
		});

		process.on('SIGINT', async () => {
			await cleanup();
			process.exit(0);
		});

		process.on('SIGTERM', async () => {
			await cleanup();
			process.exit(0);
		});

		process.on('SIGHUP', async () => {
			await cleanup();
			process.exit(0);
		});

		// Handle uncaught exceptions
		process.on('uncaughtException', async (error) => {
			console.error('Uncaught exception in SourceControlGitService', error);
			await cleanup();
			process.exit(1);
		});

		SourceControlGitService.cleanupHandlersRegistered = true;
	}

	/**
	 * Security: Synchronous cleanup for process exit scenarios
	 * Only performs operations that can be done synchronously
	 */
	private cleanupSync(): void {
		try {
			// Clear sensitive environment variables
			for (const envVar of this.sensitiveEnvVars) {
				if (process.env[envVar]) {
					delete process.env[envVar];
				}
			}
			this.sensitiveEnvVars.clear();

			// Clear git options that might contain sensitive data
			this.gitOptions = {};

			// Reset git instance
			this.git = null;
		} catch (error) {
			// Use console.error as logger might not be available during exit
			console.error('Failed to perform synchronous cleanup:', error);
		}
	}

	/**
	 * Security: Comprehensive cleanup of temporary files and sensitive data
	 * Should be called when the service is no longer needed
	 */
	async cleanup(): Promise<void> {
		try {
			this.logger.debug('Starting SourceControlGitService cleanup');

			// Clean up temporary files
			await this.cleanupTempFiles();

			// Clear sensitive data from memory
			this.clearSensitiveData();

			// Reset service state
			this.resetService();

			// Remove this instance from the global set
			SourceControlGitService.serviceInstances.delete(this);

			this.logger.debug('SourceControlGitService cleanup completed');
		} catch (error) {
			this.logger.error('Failed to cleanup SourceControlGitService', {
				error: error instanceof Error ? error.message : String(error),
			});
			throw new UnexpectedError('Failed to cleanup SourceControlGitService', { cause: error });
		}
	}

	/**
	 * Security: Clean up temporary SSH key files
	 */
	private async cleanupTempFiles(): Promise<void> {
		const cleanupPromises = Array.from(this.tempFiles).map(async (filePath) => {
			try {
				await fsRm(filePath, { force: true });
				this.logger.debug(`Cleaned up temporary file: ${filePath}`);
			} catch (error) {
				this.logger.warn(`Failed to cleanup temporary file: ${filePath}`, {
					error: error instanceof Error ? error.message : String(error),
				});
			}
		});

		await Promise.all(cleanupPromises);
		this.tempFiles.clear();
	}

	/**
	 * Security: Clear sensitive data from memory
	 */
	private clearSensitiveData(): void {
		// Clear sensitive environment variables
		for (const envVar of this.sensitiveEnvVars) {
			if (process.env[envVar]) {
				delete process.env[envVar];
			}
		}
		this.sensitiveEnvVars.clear();

		// Clear git options that might contain sensitive data
		this.gitOptions = {};
	}

	/**
	 * Security: Track temporary files created by this service
	 */
	private trackTempFile(filePath: string): void {
		this.tempFiles.add(filePath);
	}

	/**
	 * Security: Track sensitive environment variables for cleanup
	 */
	private trackSensitiveEnvVar(envVar: string): void {
		this.sensitiveEnvVars.add(envVar);
	}

	/**
	 * Run pre-checks before initialising git
	 * Checks for existence of required binaries (git and ssh for SSH protocol)
	 */
	private preInitCheck(protocol: 'ssh' | 'https' = 'ssh'): boolean {
		this.logger.debug('GitService.preCheck', { protocol });
		try {
			const gitResult = execSync('git --version', {
				stdio: ['pipe', 'pipe', 'pipe'],
			});
			this.logger.debug(`Git binary found: ${gitResult.toString()}`);
		} catch (error) {
			this.logger.error('Git binary check failed', { error });
			throw new UnexpectedError('Git binary not found', { cause: error });
		}

		// SSH binary is only required for SSH protocol
		if (protocol === 'ssh') {
			try {
				const sshResult = execSync('ssh -V', {
					stdio: ['pipe', 'pipe', 'pipe'],
				});
				this.logger.debug(`SSH binary found: ${sshResult.toString()}`);
			} catch (error) {
				this.logger.error('SSH binary check failed', { error });
				throw new UnexpectedError('SSH binary not found', { cause: error });
			}
		}
		return true;
	}

	async initService(options: {
		sourceControlPreferences: SourceControlPreferences;
		gitFolder: string;
		sshFolder: string;
		sshKeyName: string;
	}): Promise<void> {
		const { sourceControlPreferences, gitFolder, sshFolder } = options;
		this.logger.debug('GitService.init', { protocol: sourceControlPreferences.protocol });
		if (this.git !== null) {
			return;
		}

		const protocol = sourceControlPreferences.protocol ?? 'ssh';
		this.preInitCheck(protocol);
		this.logger.debug('Git pre-check passed', { protocol });

		// For SSH, we need to check SSH folder existence
		if (protocol === 'ssh') {
			sourceControlFoldersExistCheck([gitFolder, sshFolder]);
			await this.setGitSshCommand(gitFolder, sshFolder);
		} else if (protocol === 'https') {
			// For HTTPS, only check git folder existence
			sourceControlFoldersExistCheck([gitFolder]);

			if (!sourceControlPreferences.username || !sourceControlPreferences.personalAccessToken) {
				throw new UnexpectedError(
					'Username and personal access token are required for HTTPS authentication',
				);
			}

			await this.setGitHttpsAuth(
				gitFolder,
				sourceControlPreferences.username,
				sourceControlPreferences.personalAccessToken,
			);
		} else {
			throw new UnexpectedError(`Unsupported protocol: ${String(protocol)}`);
		}

		if (!(await this.checkRepositorySetup())) {
			await (this.git as unknown as SimpleGit).init();
		}
		if (!(await this.hasRemote(sourceControlPreferences.repositoryUrl))) {
			if (sourceControlPreferences.connected && sourceControlPreferences.repositoryUrl) {
				const instanceOwner = await this.ownershipService.getInstanceOwner();
				await this.initRepository(sourceControlPreferences, instanceOwner);
			}
		}
	}

	/**
	 * Update the SSH command with the path to the temp file containing the private key from the DB.
	 */
	async setGitSshCommand(
		gitFolder = this.sourceControlPreferencesService.gitFolder,
		sshFolder = this.sourceControlPreferencesService.sshFolder,
	) {
		const privateKeyPath = await this.sourceControlPreferencesService.getPrivateKeyPath();

		// Security: Track the temporary SSH key file for cleanup
		this.trackTempFile(privateKeyPath);

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

		this.gitOptions = {
			baseDir: gitFolder,
			binary: 'git',
			maxConcurrentProcesses: 6,
			trimmed: false,
		};

		const { simpleGit } = await import('simple-git');

		this.git = simpleGit(this.gitOptions)
			.env('GIT_SSH_COMMAND', sshCommand)
			.env('GIT_TERMINAL_PROMPT', '0');

		// Security: Track sensitive environment variables for cleanup
		this.trackSensitiveEnvVar('GIT_SSH_COMMAND');
		this.trackSensitiveEnvVar('GIT_TERMINAL_PROMPT');
	}

	/**
	 * Set up HTTPS authentication using username and personal access token.
	 * Configures simple-git with authentication credentials for HTTPS operations.
	 */
	async setGitHttpsAuth(
		gitFolder = this.sourceControlPreferencesService.gitFolder,
		username: string,
		personalAccessToken: string,
	): Promise<void> {
		if (!username || !personalAccessToken) {
			throw new UnexpectedError(
				'Username and personal access token are required for HTTPS authentication',
			);
		}

		this.gitOptions = {
			baseDir: gitFolder,
			binary: 'git',
			maxConcurrentProcesses: 6,
			trimmed: false,
			config: [
				// Set up credential helper to avoid prompts
				'credential.helper=',
			],
		};

		const { simpleGit } = await import('simple-git');

		// Configure simple-git with credentials using environment variables
		// This approach works with most Git providers (GitHub, GitLab, Bitbucket, etc.)
		this.git = simpleGit(this.gitOptions)
			.env('GIT_TERMINAL_PROMPT', '0')
			.env('GIT_ASKPASS', 'echo')
			.env('GIT_USERNAME', username)
			.env('GIT_PASSWORD', personalAccessToken);

		// Security: Track sensitive environment variables for cleanup
		this.trackSensitiveEnvVar('GIT_TERMINAL_PROMPT');
		this.trackSensitiveEnvVar('GIT_ASKPASS');
		this.trackSensitiveEnvVar('GIT_USERNAME');
		this.trackSensitiveEnvVar('GIT_PASSWORD');
	}

	/**
	 * Re-authenticate Git based on current preferences.
	 * This ensures credentials are always fresh before operations.
	 */
	private async reAuthenticate(): Promise<void> {
		const preferences = this.sourceControlPreferencesService.getPreferences();
		const protocol = preferences.protocol ?? 'ssh';

		try {
			if (protocol === 'ssh') {
				await this.setGitSshCommand();
			} else if (protocol === 'https') {
				if (!preferences.username || !preferences.personalAccessToken) {
					throw new UnexpectedError(
						'Username and personal access token are required for HTTPS authentication',
					);
				}

				await this.setGitHttpsAuth(
					this.sourceControlPreferencesService.gitFolder,
					preferences.username,
					preferences.personalAccessToken,
				);
			}
		} catch (error) {
			// Sanitize error messages to avoid credential exposure
			const sanitizedError =
				error instanceof Error
					? new Error(error.message.replace(/[a-zA-Z0-9._-]+:[a-zA-Z0-9._-]+@/g, '[CREDENTIALS]@'))
					: error;

			this.logger.error('Authentication setup failed', {
				protocol,
				error: sanitizedError instanceof Error ? sanitizedError.message : String(sanitizedError),
			});
			throw new UnexpectedError('Failed to authenticate Git', { cause: sanitizedError });
		}
	}

	resetService() {
		this.git = null;
		// Note: Cleanup of temporary files and sensitive data should be done via cleanup() method
		// This method only resets the git instance for service reinitialization
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
				// Sanitize URL in logs to avoid credential exposure
				const sanitizedUrl = foundRemote.refs.push.replace(/\/\/[^@/]+@/, '//[REDACTED]@');
				this.logger.debug(`Git remote found: ${foundRemote.name}: ${sanitizedUrl}`);
				return true;
			}
		} catch (error) {
			this.logger.error('Git remote check failed', { error });
			throw new UnexpectedError('Git is not initialized', { cause: error });
		}
		// Sanitize URL in logs
		const sanitizedRemote = remote.replace(/\/\/[^@/]+@/, '//[REDACTED]@');
		this.logger.debug(`Git remote not found: ${sanitizedRemote}`);
		return false;
	}

	async initRepository(
		sourceControlPreferences: Pick<
			SourceControlPreferences,
			'repositoryUrl' | 'branchName' | 'initRepo'
		>,
		user: User,
	): Promise<void> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (Promise)');
		}
		if (sourceControlPreferences.initRepo) {
			try {
				await this.git.init();
			} catch (error) {
				this.logger.debug(`Git init: ${(error as Error).message}`);
			}
		}
		try {
			await this.git.addRemote(SOURCE_CONTROL_ORIGIN, sourceControlPreferences.repositoryUrl);
			// Sanitize URL in logs to avoid credential exposure
			const sanitizedUrl = sourceControlPreferences.repositoryUrl.replace(
				/\/\/[^@/]+@/,
				'//[REDACTED]@',
			);
			this.logger.debug(`Git remote added: ${sanitizedUrl}`);
		} catch (error) {
			if ((error as Error).message.includes('remote origin already exists')) {
				this.logger.debug(`Git remote already exists: ${(error as Error).message}`);
			} else {
				// Sanitize error message to avoid credential exposure
				const sanitizedError =
					error instanceof Error
						? new Error(error.message.replace(/\/\/[^@/]+@/, '//[REDACTED]@'))
						: error;
				throw sanitizedError;
			}
		}
		await this.setGitUserDetails(
			user.firstName && user.lastName
				? `${user.firstName} ${user.lastName}`
				: SOURCE_CONTROL_DEFAULT_NAME,
			user.email ?? SOURCE_CONTROL_DEFAULT_EMAIL,
		);

		await this.trackRemoteIfReady(sourceControlPreferences.branchName);

		if (sourceControlPreferences.initRepo) {
			try {
				const branches = await this.getBranches();
				if (branches.branches?.length === 0) {
					await this.git.raw(['branch', '-M', sourceControlPreferences.branchName]);
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
	private async trackRemoteIfReady(targetBranch: string) {
		if (!this.git) return;

		await this.fetch();

		const { currentBranch, branches: remoteBranches } = await this.getBranches();

		if (!currentBranch && remoteBranches.some((b) => b === targetBranch)) {
			await this.git.checkout(targetBranch);

			const upstream = [SOURCE_CONTROL_ORIGIN, targetBranch].join('/');

			await this.git.branch([`--set-upstream-to=${upstream}`, targetBranch]);

			this.logger.info('Set local git repository to track remote', { upstream });
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
		await this.git.checkout(branch);
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
		await this.reAuthenticate();
		try {
			const result = await this.git.fetch();
			return result;
		} finally {
			// Security: Clear sensitive data after remote operation
			this.clearSensitiveData();
		}
	}

	async pull(options: { ffOnly: boolean } = { ffOnly: true }): Promise<PullResult> {
		if (!this.git) {
			throw new UnexpectedError('Git is not initialized (pull)');
		}
		await this.reAuthenticate();
		try {
			const pullOptions: string[] = [];
			if (options.ffOnly) {
				pullOptions.push('--ff-only');
			}
			const result = await this.git.pull('origin', undefined, pullOptions);
			return result;
		} finally {
			// Security: Clear sensitive data after remote operation
			this.clearSensitiveData();
		}
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
		await this.reAuthenticate();
		try {
			if (force) {
				return await this.git.push(SOURCE_CONTROL_ORIGIN, branch, ['-f']);
			}
			return await this.git.push(SOURCE_CONTROL_ORIGIN, branch);
		} finally {
			// Security: Clear sensitive data after remote operation
			this.clearSensitiveData();
		}
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
