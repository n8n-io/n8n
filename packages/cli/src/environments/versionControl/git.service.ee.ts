import { Service } from 'typedi';
import { execSync } from 'child_process';
import { LoggerProxy } from 'n8n-workflow';
import path from 'path';
import { access as fsAccess, mkdir as fsMkdir } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import type { FetchResult, SimpleGit, SimpleGitOptions, StatusResult } from 'simple-git';
import { simpleGit } from 'simple-git';
import type { VersionControlPreferences } from './types/versionControlPreferences';

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

	async init(options: {
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

		// Make sure the folders exists
		[gitFolder, sshFolder].forEach(async (folder) => {
			try {
				await fsAccess(folder, fsConstants.F_OK);
			} catch (error) {
				await fsMkdir(folder);
			}
		});

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

	reset() {
		this.git = null;
	}

	resetLocalRepository() {
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
			const foundRemote = remotes.find((e) => e.name === 'origin' && e.refs.push === remote);
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

	async initRepository(versionControlPreferences: VersionControlPreferences): Promise<void> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		await this.git.addRemote('origin', versionControlPreferences.repositoryUrl);
		await this.git.addConfig('user.email', versionControlPreferences.authorEmail);
		await this.git.addConfig('user.name', versionControlPreferences.authorName);
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
		await this.git.checkoutBranch(branch, 'origin/' + branch);
		return this.getBranches();
	}

	async fetch(): Promise<FetchResult> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		return this.git.fetch();
	}

	async pull(): Promise<void> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		throw new Error('not implemented');
	}

	async push(): Promise<void> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		throw new Error('not implemented');
	}

	async stage(): Promise<void> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		throw new Error('not implemented');
	}

	async commit(message: string): Promise<void> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		console.log(message);
		throw new Error('not implemented');
	}

	async status(): Promise<StatusResult> {
		if (!this.git) {
			throw new Error('Git is not initialized');
		}
		const statusResult = await this.git.status();
		return statusResult;
	}
}
