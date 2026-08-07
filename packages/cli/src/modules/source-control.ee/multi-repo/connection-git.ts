import type { Logger } from '@n8n/backend-common';
import { resolveProxyUrl } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import * as path from 'path';
import type { SimpleGit, SimpleGitOptions } from 'simple-git';

import {
	SOURCE_CONTROL_DEFAULT_EMAIL,
	SOURCE_CONTROL_DEFAULT_NAME,
	SOURCE_CONTROL_ORIGIN,
} from '../constants';
import { sourceControlFoldersExistCheck } from '../source-control-helper.ee';

export interface ConnectionGitOptions {
	/** Per-connection git working directory. */
	workDir: string;
	/** Per-connection SSH folder (key + known_hosts). */
	sshFolder: string;
	connectionType: 'ssh' | 'https';
	repositoryUrl: string;
	/** Decrypted credentials, https connections only. */
	httpsCredentials?: { username: string; password: string };
	/** Path to the decrypted private key on disk, ssh connections only. */
	privateKeyPath?: string;
	logger: Logger;
}

export interface ConnectionGitFileStatus {
	path: string;
	status: 'A' | 'M' | 'D';
}

/**
 * Git operations bound to one source control connection. Unlike the legacy
 * singleton SourceControlGitService (one instance-wide SimpleGit configured from
 * the preferences blob), this is a plain class constructed per operation from a
 * connection row, so any number of repos can coexist.
 */
export class ConnectionGit {
	private git: SimpleGit | null = null;

	constructor(private readonly opts: ConnectionGitOptions) {}

	private async getGit(): Promise<SimpleGit> {
		if (this.git) return this.git;

		sourceControlFoldersExistCheck([this.opts.workDir, this.opts.sshFolder]);

		const baseOptions: Partial<SimpleGitOptions> = {
			baseDir: this.opts.workDir,
			binary: 'git',
			maxConcurrentProcesses: 6,
			trimmed: false,
		};

		const { simpleGit } = await import('simple-git');

		if (this.opts.connectionType === 'https') {
			const credentials = this.opts.httpsCredentials ?? { username: '', password: '' };
			const escapeShellArg = (arg: string) => `'${arg.replace(/'/g, "'\"'\"'")}'`;
			const credentialScript = `!f() { echo username=${escapeShellArg(credentials.username)}; echo password=${escapeShellArg(credentials.password)}; }; f`;

			const config = [
				'credential.helper=' + credentialScript,
				// ensures that the credentials are only used for this connection's repositoryUrl
				'credential.useHttpPath=true',
			];
			const proxyUrl = resolveProxyUrl(this.opts.repositoryUrl);
			if (proxyUrl) config.push(`http.proxy=${proxyUrl}`);

			this.git = simpleGit({
				...baseOptions,
				config,
				unsafe: { allowUnsafeCredentialHelper: true },
			}).env('GIT_TERMINAL_PROMPT', '0');
		} else {
			const knownHostsPath = path.join(this.opts.sshFolder, 'known_hosts');
			const normalize = (p: string) => p.split(/[/\\]/).join('/').replace(/"/g, '\\"');
			const sshCommand = `ssh -o UserKnownHostsFile="${normalize(knownHostsPath)}" -o StrictHostKeyChecking=accept-new -i "${normalize(this.opts.privateKeyPath ?? '')}"`;

			this.git = simpleGit({
				...baseOptions,
				unsafe: { allowUnsafeSshCommand: true },
			})
				.env('GIT_SSH_COMMAND', sshCommand)
				.env('GIT_TERMINAL_PROMPT', '0');
		}

		return this.git;
	}

	/** Initialize the working dir, point origin at the repo and track the branch. */
	async initAndTrack(branchName: string, user: User): Promise<void> {
		const git = await this.getGit();

		if (!(await git.checkIsRepo())) {
			await git.init();
		}

		try {
			await git.addRemote(SOURCE_CONTROL_ORIGIN, this.opts.repositoryUrl);
		} catch (error) {
			if (!(error as Error).message.includes('remote origin already exists')) throw error;
		}

		await git.addConfig(
			'user.name',
			user.firstName && user.lastName
				? `${user.firstName} ${user.lastName}`
				: SOURCE_CONTROL_DEFAULT_NAME,
		);
		await git.addConfig('user.email', user.email ?? SOURCE_CONTROL_DEFAULT_EMAIL);

		await git.fetch();
		const { branches, currentBranch } = await this.getBranches();
		if (!currentBranch && branches.includes(branchName)) {
			await git.checkout(branchName);
			await git.branch([`--set-upstream-to=${SOURCE_CONTROL_ORIGIN}/${branchName}`, branchName]);
		} else if (!branches.includes(branchName)) {
			// Empty remote: name the local branch; `push -u` creates it remotely later.
			await git.raw(['branch', '-M', branchName]);
		}
	}

	async fetch(): Promise<void> {
		const git = await this.getGit();
		await git.fetch();
	}

	async getBranches(): Promise<{ branches: string[]; currentBranch: string }> {
		const git = await this.getGit();
		const { branches } = await git.branch(['-r']);
		const remoteBranches = Object.keys(branches)
			.map((name) => name.split('/').slice(1).join('/'))
			.filter((name) => name !== 'HEAD');
		const { current } = await git.branch();
		return { branches: remoteBranches, currentBranch: current };
	}

	async resetToRemote(branch: string): Promise<void> {
		const git = await this.getGit();
		await git.raw(['reset', '--hard', `${SOURCE_CONTROL_ORIGIN}/${branch}`]);
		await git.clean('f', ['-d']);
	}

	/** Working tree vs remote branch — one symmetric preview for push and pull. */
	async diffVsRemote(branch: string): Promise<ConnectionGitFileStatus[]> {
		const git = await this.getGit();
		try {
			const raw = await git.raw(['diff', `${SOURCE_CONTROL_ORIGIN}/${branch}`, '--name-status']);
			return raw
				.split('\n')
				.filter((line) => line.trim().length > 0)
				.map((line) => {
					const [status, ...pathParts] = line.split('\t');
					return { path: pathParts.join('\t'), status: status.charAt(0) as 'A' | 'M' | 'D' };
				});
		} catch {
			// No remote branch yet (first push to an empty repo): everything is an addition.
			const status = await git.status();
			return [...status.not_added, ...status.created, ...status.modified].map((filePath) => ({
				path: filePath,
				status: 'A' as const,
			}));
		}
	}

	async addAllCommitPush(message: string, branch: string): Promise<{ commitHash: string }> {
		const git = await this.getGit();
		await git.add(['-A']);
		const commit = await git.commit(message);
		await git.push(SOURCE_CONTROL_ORIGIN, branch, ['-u']);
		this.opts.logger.info('Pushed source control connection changes', {
			branch,
			commit: commit.commit,
		});
		return { commitHash: commit.commit };
	}
}
