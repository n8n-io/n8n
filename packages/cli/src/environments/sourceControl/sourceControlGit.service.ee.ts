import { Service } from 'typedi';
import { execSync } from 'child_process';
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
import type { SourceControlPreferences } from './types/sourceControlPreferences';
import {
	SOURCE_CONTROL_DEFAULT_BRANCH,
	SOURCE_CONTROL_DEFAULT_EMAIL,
	SOURCE_CONTROL_DEFAULT_NAME,
	SOURCE_CONTROL_ORIGIN,
} from './constants';
import { sourceControlFoldersExistCheck } from './sourceControlHelper.ee';
import type { User } from '@db/entities/User';
import { Logger } from '@/Logger';
import { ApplicationError } from 'n8n-workflow';
import { OwnershipService } from '@/services/ownership.service';
import { SourceControlPreferencesService } from './sourceControlPreferences.service.ee';

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
			throw new ApplicationError('Git binary not found', { cause: error });
		}
		try {
			const sshResult = execSync('ssh -V', {
				stdio: ['pipe', 'pipe', 'pipe'],
			});
			this.logger.debug(`SSH binary found: ${sshResult.toString()}`);
		} catch (error) {
			throw new ApplicationError('SSH binary not found', { cause: error });
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

		await this.setGitSshCommand(gitFolder, sshFolder);

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

		const sshKnownHosts = path.join(sshFolder, 'known_hosts');
		const sshCommand = `ssh -o UserKnownHostsFile=${sshKnownHosts} -o StrictHostKeyChecking=no -i ${privateKeyPath}`;

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
	}

	resetService() {
		this.git = null;
	}

	private async checkRepositorySetup(): Promise<boolean> {
		if (!this.git) {
			throw new ApplicationError('Git is not initialized (async)');
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
			throw new ApplicationError('Git is not initialized (async)');
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
			throw new ApplicationError('Git is not initialized', { cause: error });
		}
		this.logger.debug(`Git remote not found: ${remote}`);
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
			throw new ApplicationError('Git is not initialized (Promise)');
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
			this.logger.debug(`Git remote added: ${sourceControlPreferences.repositoryUrl}`);
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
			throw new ApplicationError('Git is not initialized (setGitUserDetails)');
		}
		await this.git.addConfig('user.email', email);
		await this.git.addConfig('user.name', name);
	}

	async getBranches(): Promise<{ branches: string[]; currentBranch: string }> {
		if (!this.git) {
			throw new ApplicationError('Git is not initialized (getBranches)');
		}

		try {
			// Get remote branches
			const { branches } = await this.git.branch(['-r']);
			const remoteBranches = Object.keys(branches)
				.map((name) => name.split('/')[1])
				.filter((name) => name !== 'HEAD');

			const { current } = await this.git.branch();

			return {
				branches: remoteBranches,
				currentBranch: current,
			};
		} catch (error) {
			throw new ApplicationError('Could not get remote branches from repository', { cause: error });
		}
	}

	async setBranch(branch: string): Promise<{ branches: string[]; currentBranch: string }> {
		if (!this.git) {
			throw new ApplicationError('Git is not initialized (setBranch)');
		}
		await this.git.checkout(branch);
		await this.git.branch([`--set-upstream-to=${SOURCE_CONTROL_ORIGIN}/${branch}`, branch]);
		return await this.getBranches();
	}

	async getCurrentBranch(): Promise<{ current: string; remote: string }> {
		if (!this.git) {
			throw new ApplicationError('Git is not initialized (getCurrentBranch)');
		}
		const currentBranch = (await this.git.branch()).current;
		return {
			current: currentBranch,
			remote: 'origin/' + currentBranch,
		};
	}

	async diffRemote(): Promise<DiffResult | undefined> {
		if (!this.git) {
			throw new ApplicationError('Git is not initialized (diffRemote)');
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
			throw new ApplicationError('Git is not initialized (diffLocal)');
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
			throw new ApplicationError('Git is not initialized (fetch)');
		}
		await this.setGitSshCommand();
		return await this.git.fetch();
	}

	async pull(options: { ffOnly: boolean } = { ffOnly: true }): Promise<PullResult> {
		if (!this.git) {
			throw new ApplicationError('Git is not initialized (pull)');
		}
		await this.setGitSshCommand();
		const params = {};
		if (options.ffOnly) {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Object.assign(params, { '--ff-only': true });
		}
		return await this.git.pull(params);
	}

	async push(
		options: { force: boolean; branch: string } = {
			force: false,
			branch: SOURCE_CONTROL_DEFAULT_BRANCH,
		},
	): Promise<PushResult> {
		const { force, branch } = options;
		if (!this.git) {
			throw new ApplicationError('Git is not initialized ({)');
		}
		await this.setGitSshCommand();
		if (force) {
			return await this.git.push(SOURCE_CONTROL_ORIGIN, branch, ['-f']);
		}
		return await this.git.push(SOURCE_CONTROL_ORIGIN, branch);
	}

	async stage(files: Set<string>, deletedFiles?: Set<string>): Promise<string> {
		if (!this.git) {
			throw new ApplicationError('Git is not initialized (stage)');
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
			throw new ApplicationError('Git is not initialized (Promise)');
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
			throw new ApplicationError('Git is not initialized (commit)');
		}
		return await this.git.commit(message);
	}

	async status(): Promise<StatusResult> {
		if (!this.git) {
			throw new ApplicationError('Git is not initialized (status)');
		}
		const statusResult = await this.git.status();
		return statusResult;
	}
}
