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
import { simpleGit } from 'simple-git';
import type { VersionControlPreferences } from './types/versionControlPreferences';
import { VERSION_CONTROL_DEFAULT_BRANCH, VERSION_CONTROL_ORIGIN } from './constants';
import { versionControlFoldersExistCheck } from './versionControlHelper.ee';

@Service()
export class VersionControlGitService {
	git: SimpleGit | null = null;

	private gitOptions: Partial<SimpleGitOptions> = {};

	/**
	 * Run pre-checks before initialising git
	 * Checks for existence of required binaries (git and ssh)
	 */
	preInitCheck(): boolean {
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
		versionControlPreferences: VersionControlPreferences;
		gitFolder: string;
		sshFolder: string;
		sshKeyName: string;
	}): Promise<void> {
		const { versionControlPreferences, gitFolder, sshKeyName, sshFolder } = options;
		LoggerProxy.debug('GitService.init');
		if (this.git !== null) {
			return;
		}

		this.preInitCheck();
		LoggerProxy.debug('Git pre-check passed');

		versionControlFoldersExistCheck([gitFolder, sshFolder]);

		const sshKnownHosts = path.join(sshFolder, 'known_hosts');
		const sshCommand = `ssh -o UserKnownHostsFile=${sshKnownHosts} -o StrictHostKeyChecking=no -i ${sshKeyName}`;

		this.gitOptions = {
			baseDir: gitFolder,
			binary: 'git',
			maxConcurrentProcesses: 6,
			trimmed: false,
		};

		this.git = simpleGit(this.gitOptions)
			// Tell git not to ask for any information via the terminal like for
			// example the username. As nobody will be able to answer it would
			// n8n keep on waiting forever.
			.env('GIT_SSH_COMMAND', sshCommand)
			.env('GIT_TERMINAL_PROMPT', '0');

		if (!(await this.checkRepositorySetup())) {
			await this.git.init();
		}
		if (!(await this.hasRemote(versionControlPreferences.repositoryUrl))) {
			if (versionControlPreferences.connected && versionControlPreferences.repositoryUrl) {
				await this.initRepository(versionControlPreferences);
			}
		}
	}

	resetService() {
		this.git = null;
	}

	resetLocalRepository() {
		// TODO: Implement
		this.git = null;
	}

	async checkRepositorySetup(): Promise<boolean> {
		if (!this.git) {
			throw new Error('Git is not initialized');
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

	async hasRemote(remote: string): Promise<boolean> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		try {
			const remotes = await this.git.getRemotes(true);
			const foundRemote = remotes.find(
				(e) => e.name === VERSION_CONTROL_ORIGIN && e.refs.push === remote,
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
		versionControlPreferences: Pick<
			VersionControlPreferences,
			'repositoryUrl' | 'authorEmail' | 'authorName' | 'branchName' | 'initRepo'
		>,
	): Promise<void> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		if (versionControlPreferences.initRepo) {
			try {
				await this.git.init();
			} catch (error) {
				LoggerProxy.debug(`Git init: ${(error as Error).message}`);
			}
		}
		try {
			await this.git.addRemote(VERSION_CONTROL_ORIGIN, versionControlPreferences.repositoryUrl);
		} catch (error) {
			if ((error as Error).message.includes('remote origin already exists')) {
				LoggerProxy.debug(`Git remote already exists: ${(error as Error).message}`);
			} else {
				throw error;
			}
		}
		await this.git.addConfig('user.email', versionControlPreferences.authorEmail);
		await this.git.addConfig('user.name', versionControlPreferences.authorName);
		if (versionControlPreferences.initRepo) {
			try {
				const branches = await this.getBranches();
				if (branches.branches?.length === 0) {
					await this.git.raw(['branch', '-M', versionControlPreferences.branchName]);
				}
			} catch (error) {
				LoggerProxy.debug(`Git init: ${(error as Error).message}`);
			}
		}
	}

	async getBranches(): Promise<{ branches: string[]; currentBranch: string }> {
		if (!this.git) {
			throw new Error('Git is not initialized');
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
			throw new Error('Git is not initialized');
		}
		await this.git.checkout(branch);
		return this.getBranches();
	}

	async fetch(): Promise<FetchResult> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		return this.git.fetch();
	}

	async getCurrentBranch(): Promise<{ current: string; remote: string }> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		const currentBranch = (await this.git.branch()).current;
		return {
			current: currentBranch,
			remote: 'origin/' + currentBranch,
		};
	}

	async diff(options?: { target?: string; dots?: '..' | '...' }): Promise<DiffResult> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		const currentBranch = await this.getCurrentBranch();
		const target = options?.target ?? currentBranch.remote;
		const dots = options?.dots ?? '...';
		return this.git.diffSummary([dots + target]);
	}

	async diffRemote(): Promise<DiffResult | undefined> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		const currentBranch = await this.getCurrentBranch();
		if (currentBranch.remote) {
			const target = currentBranch.remote;
			return this.git.diffSummary(['...' + target]);
		}
		return;
	}

	async diffLocal(): Promise<DiffResult | undefined> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		const currentBranch = await this.getCurrentBranch();
		if (currentBranch.remote) {
			const target = currentBranch.current;
			return this.git.diffSummary([target]);
		}
		return;
	}

	async pull(options: { ffOnly: boolean } = { ffOnly: true }): Promise<PullResult> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		if (options.ffOnly) {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			return this.git.pull(undefined, undefined, { '--ff-only': null });
		}
		return this.git.pull();
	}

	async push(
		options: { force: boolean; branch: string } = {
			force: false,
			branch: VERSION_CONTROL_DEFAULT_BRANCH,
		},
	): Promise<PushResult> {
		const { force, branch } = options;
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		if (force) {
			return this.git.push(VERSION_CONTROL_ORIGIN, branch, ['-f']);
		}
		return this.git.push(VERSION_CONTROL_ORIGIN, branch);
	}

	async stage(files: Set<string>, deletedFiles?: Set<string>): Promise<string> {
		if (!this.git) {
			throw new Error('Git is not initialized');
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
		options: { hard?: boolean; target: string } = { hard: false, target: 'HEAD' },
	): Promise<string> {
		if (!this.git) {
			throw new Error('Git is not initialized');
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
			throw new Error('Git is not initialized');
		}
		return this.git.commit(message);
	}

	async status(): Promise<StatusResult> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		const statusResult = await this.git.status();
		return statusResult;
	}
}
