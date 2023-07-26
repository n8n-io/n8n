import { Service } from 'typedi';
import { execSync } from 'child_process';
import { LoggerProxy } from 'n8n-workflow';
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
import type { User } from '../../databases/entities/User';
import { getInstanceOwner } from '../../UserManagement/UserManagementHelper';

@Service()
export class SourceControlGitService {
	git: SimpleGit | null = null;

	private gitOptions: Partial<SimpleGitOptions> = {};

	/**
	 * Run pre-checks before initialising git
	 * Checks for existence of required binaries (git and ssh)
	 */
	private preInitCheck(): boolean {
		LoggerProxy.debug('GitService.preCheck');
		try {
			const gitResult = execSync('git --version', {
				stdio: ['pipe', 'pipe', 'pipe'],
			});
			LoggerProxy.debug(`Git binary found: ${gitResult.toString()}`);
		} catch (error) {
			throw new Error(`Git binary not found: ${(error as Error).message}`);
		}
		try {
			const sshResult = execSync('ssh -V', {
				stdio: ['pipe', 'pipe', 'pipe'],
			});
			LoggerProxy.debug(`SSH binary found: ${sshResult.toString()}`);
		} catch (error) {
			throw new Error(`SSH binary not found: ${(error as Error).message}`);
		}
		return true;
	}

	async initService(options: {
		sourceControlPreferences: SourceControlPreferences;
		gitFolder: string;
		sshFolder: string;
		sshKeyName: string;
	}): Promise<void> {
		const {
			sourceControlPreferences: sourceControlPreferences,
			gitFolder,
			sshKeyName,
			sshFolder,
		} = options;
		LoggerProxy.debug('GitService.init');
		if (this.git !== null) {
			return;
		}

		this.preInitCheck();
		LoggerProxy.debug('Git pre-check passed');

		sourceControlFoldersExistCheck([gitFolder, sshFolder]);

		const sshKnownHosts = path.join(sshFolder, 'known_hosts');
		const sshCommand = `ssh -o UserKnownHostsFile=${sshKnownHosts} -o StrictHostKeyChecking=no -i ${sshKeyName}`;

		this.gitOptions = {
			baseDir: gitFolder,
			binary: 'git',
			maxConcurrentProcesses: 6,
			trimmed: false,
		};

		const { simpleGit } = await import('simple-git');

		this.git = simpleGit(this.gitOptions)
			// Tell git not to ask for any information via the terminal like for
			// example the username. As nobody will be able to answer it would
			// n8n keep on waiting forever.
			.env('GIT_SSH_COMMAND', sshCommand)
			.env('GIT_TERMINAL_PROMPT', '0');

		if (!(await this.checkRepositorySetup())) {
			await this.git.init();
		}
		if (!(await this.hasRemote(sourceControlPreferences.repositoryUrl))) {
			if (sourceControlPreferences.connected && sourceControlPreferences.repositoryUrl) {
				const user = await getInstanceOwner();
				await this.initRepository(sourceControlPreferences, user);
			}
		}
	}

	resetService() {
		this.git = null;
	}

	private async checkRepositorySetup(): Promise<boolean> {
		if (!this.git) {
			throw new Error('Git is not initialized (async)');
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
			throw new Error('Git is not initialized (async)');
		}
		try {
			const remotes = await this.git.getRemotes(true);
			const foundRemote = remotes.find(
				(e) => e.name === SOURCE_CONTROL_ORIGIN && e.refs.push === remote,
			);
			if (foundRemote) {
				LoggerProxy.debug(`Git remote found: ${foundRemote.name}: ${foundRemote.refs.push}`);
				return true;
			}
		} catch (error) {
			throw new Error(`Git is not initialized ${(error as Error).message}`);
		}
		LoggerProxy.debug(`Git remote not found: ${remote}`);
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
			throw new Error('Git is not initialized (Promise)');
		}
		if (sourceControlPreferences.initRepo) {
			try {
				await this.git.init();
			} catch (error) {
				LoggerProxy.debug(`Git init: ${(error as Error).message}`);
			}
		}
		try {
			await this.git.addRemote(SOURCE_CONTROL_ORIGIN, sourceControlPreferences.repositoryUrl);
		} catch (error) {
			if ((error as Error).message.includes('remote origin already exists')) {
				LoggerProxy.debug(`Git remote already exists: ${(error as Error).message}`);
			} else {
				throw error;
			}
		}
		await this.setGitUserDetails(
			`${user.firstName} ${user.lastName}` ?? SOURCE_CONTROL_DEFAULT_NAME,
			user.email ?? SOURCE_CONTROL_DEFAULT_EMAIL,
		);
		if (sourceControlPreferences.initRepo) {
			try {
				const branches = await this.getBranches();
				if (branches.branches?.length === 0) {
					await this.git.raw(['branch', '-M', sourceControlPreferences.branchName]);
				}
			} catch (error) {
				LoggerProxy.debug(`Git init: ${(error as Error).message}`);
			}
		}
	}

	async setGitUserDetails(name: string, email: string): Promise<void> {
		if (!this.git) {
			throw new Error('Git is not initialized (setGitUserDetails)');
		}
		await this.git.addConfig('user.email', name);
		await this.git.addConfig('user.name', email);
	}

	async getBranches(): Promise<{ branches: string[]; currentBranch: string }> {
		if (!this.git) {
			throw new Error('Git is not initialized (getBranches)');
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
			throw new Error(`Could not get remote branches from repository ${(error as Error).message}`);
		}
	}

	async setBranch(branch: string): Promise<{ branches: string[]; currentBranch: string }> {
		if (!this.git) {
			throw new Error('Git is not initialized (setBranch)');
		}
		await this.git.checkout(branch);
		await this.git.branch([`--set-upstream-to=${SOURCE_CONTROL_ORIGIN}/${branch}`, branch]);
		return this.getBranches();
	}

	async getCurrentBranch(): Promise<{ current: string; remote: string }> {
		if (!this.git) {
			throw new Error('Git is not initialized (getCurrentBranch)');
		}
		const currentBranch = (await this.git.branch()).current;
		return {
			current: currentBranch,
			remote: 'origin/' + currentBranch,
		};
	}

	async diffRemote(): Promise<DiffResult | undefined> {
		if (!this.git) {
			throw new Error('Git is not initialized (diffRemote)');
		}
		const currentBranch = await this.getCurrentBranch();
		if (currentBranch.remote) {
			const target = currentBranch.remote;
			return this.git.diffSummary(['...' + target, '--ignore-all-space']);
		}
		return;
	}

	async diffLocal(): Promise<DiffResult | undefined> {
		if (!this.git) {
			throw new Error('Git is not initialized (diffLocal)');
		}
		const currentBranch = await this.getCurrentBranch();
		if (currentBranch.remote) {
			const target = currentBranch.current;
			return this.git.diffSummary([target, '--ignore-all-space']);
		}
		return;
	}

	async fetch(): Promise<FetchResult> {
		if (!this.git) {
			throw new Error('Git is not initialized (fetch)');
		}
		return this.git.fetch();
	}

	async pull(options: { ffOnly: boolean } = { ffOnly: true }): Promise<PullResult> {
		if (!this.git) {
			throw new Error('Git is not initialized (pull)');
		}
		const params = {};
		if (options.ffOnly) {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Object.assign(params, { '--ff-only': true });
		}
		return this.git.pull(params);
	}

	async push(
		options: { force: boolean; branch: string } = {
			force: false,
			branch: SOURCE_CONTROL_DEFAULT_BRANCH,
		},
	): Promise<PushResult> {
		const { force, branch } = options;
		if (!this.git) {
			throw new Error('Git is not initialized ({)');
		}
		if (force) {
			return this.git.push(SOURCE_CONTROL_ORIGIN, branch, ['-f']);
		}
		return this.git.push(SOURCE_CONTROL_ORIGIN, branch);
	}

	async stage(files: Set<string>, deletedFiles?: Set<string>): Promise<string> {
		if (!this.git) {
			throw new Error('Git is not initialized (stage)');
		}
		if (deletedFiles?.size) {
			try {
				await this.git.rm(Array.from(deletedFiles));
			} catch (error) {
				LoggerProxy.debug(`Git rm: ${(error as Error).message}`);
			}
		}
		return this.git.add(Array.from(files));
	}

	async resetBranch(
		options: { hard: boolean; target: string } = { hard: true, target: 'HEAD' },
	): Promise<string> {
		if (!this.git) {
			throw new Error('Git is not initialized (Promise)');
		}
		if (options?.hard) {
			return this.git.raw(['reset', '--hard', options.target]);
		}
		return this.git.raw(['reset', options.target]);
		// built-in reset method does not work
		// return this.git.reset();
	}

	async commit(message: string): Promise<CommitResult> {
		if (!this.git) {
			throw new Error('Git is not initialized (commit)');
		}
		return this.git.commit(message);
	}

	async status(): Promise<StatusResult> {
		if (!this.git) {
			throw new Error('Git is not initialized (status)');
		}
		const statusResult = await this.git.status();
		return statusResult;
	}
}
