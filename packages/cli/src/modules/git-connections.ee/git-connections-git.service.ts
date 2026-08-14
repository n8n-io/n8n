import type { GitConnectionType, GitKeyGeneratorType } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { chmod, mkdir, mkdtemp, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import type { SimpleGit, SimpleGitOptions } from 'simple-git';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';

import type { GitConnection } from './database/entities/git-connection.entity';
import {
	buildHttpsGitConfig,
	buildSshCommand,
	generateSshKeyPair,
} from './git-connections-git.utils';

const GIT_KEY_COMMENT = 'n8n git connection';

type PlainCredentials =
	| { type: 'ssh'; privateKey: string }
	| { type: 'https'; username: string; password: string };

@Service()
export class GitConnectionsGitService {
	constructor(private readonly logger: Logger) {
		this.logger = this.logger.scoped('git-connections');
	}

	validateRepositoryUrl(repositoryUrl: string, connectionType: GitConnectionType) {
		if (connectionType === 'https') {
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
			return;
		}

		this.validateSshRepositoryUrl(repositoryUrl);
	}

	/**
	 * Only accept `ssh://host/path` and scp-like `user@host:path`. Reject a
	 * leading `-` (option injection), the `::` transport-helper form (e.g.
	 * `ext::<cmd>`, which runs arbitrary commands), and any non-ssh scheme (e.g.
	 * `file://`, `http://`) — git's remote transports would otherwise let a URL
	 * clone local paths off the host or execute commands.
	 */
	private validateSshRepositoryUrl(repositoryUrl: string) {
		const error = new BadRequestError(
			'SSH connections require an ssh:// or user@host:path repository URL',
		);

		// Reject option injection (leading `-`) and the transport-helper form (`ext::<cmd>`).
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
			if (!url.hostname || !url.pathname || url.pathname === '/') throw error;
			return;
		}

		// scp-like: [user@]host:path, host must not start with `-`.
		const isScpLike = /^(?:[a-zA-Z0-9_.-]+@)?[a-zA-Z0-9._][a-zA-Z0-9._-]*:[^\s]+$/.test(
			repositoryUrl,
		);
		if (!isScpLike) throw error;
	}

	async validateBranchName(branchName: string) {
		const { simpleGit } = await import('simple-git');
		try {
			await simpleGit().raw(['check-ref-format', '--branch', branchName]);
		} catch {
			throw new BadRequestError(`Invalid Git branch name: ${branchName}`);
		}
	}

	async generateSshKeyPair(keyType: GitKeyGeneratorType) {
		return await generateSshKeyPair(keyType, GIT_KEY_COMMENT);
	}

	async connect({
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
		const repositoryFolder = path.join(rootFolder, 'repository');
		const nextRepositoryFolder = path.join(rootFolder, 'repository-next');
		await rm(nextRepositoryFolder, { recursive: true, force: true });

		try {
			await this.withGit(connection, credentials, rootFolder, async (git) => {
				const remoteRefs = await git.listRemote([
					'--heads',
					connection.repositoryUrl,
					`refs/heads/${branchName}`,
				]);
				if (!remoteRefs.trim()) {
					throw new BadRequestError(`Remote branch does not exist: ${branchName}`);
				}
				await git.clone(connection.repositoryUrl, nextRepositoryFolder, [
					'--branch',
					branchName,
					'--single-branch',
					'--no-tags',
				]);
				await rm(repositoryFolder, { recursive: true, force: true });
				await rename(nextRepositoryFolder, repositoryFolder);
			});
		} catch (error) {
			await rm(nextRepositoryFolder, { recursive: true, force: true });
			if (error instanceof BadRequestError) throw error;
			this.logger.warn('Failed to connect to Git repository');
			throw new BadRequestError('Could not connect to the Git repository');
		}
	}

	async cleanup(rootFolder: string) {
		await rm(rootFolder, { recursive: true, force: true });
	}

	private async withGit<T>(
		connection: GitConnection,
		credentials: PlainCredentials,
		baseDir: string,
		operation: (git: SimpleGit) => Promise<T>,
	) {
		await mkdir(baseDir, { recursive: true });
		const options: Partial<SimpleGitOptions> = {
			baseDir,
			binary: 'git',
			maxConcurrentProcesses: 1,
			trimmed: false,
		};
		const { simpleGit } = await import('simple-git');
		let temporaryFolder: string | undefined;

		try {
			let git: SimpleGit;
			if (credentials.type === 'https') {
				git = simpleGit({
					...options,
					config: buildHttpsGitConfig(connection.repositoryUrl, credentials),
					unsafe: { allowUnsafeCredentialHelper: true },
				}).env('GIT_TERMINAL_PROMPT', '0');
			} else {
				temporaryFolder = await mkdtemp(path.join(tmpdir(), 'n8n-git-connection-'));
				const privateKeyPath = path.join(temporaryFolder, 'private-key');
				await writeFile(privateKeyPath, credentials.privateKey, { mode: 0o600 });
				await chmod(privateKeyPath, 0o600);
				const connectionRoot =
					path.basename(baseDir) === 'repository' ? path.dirname(baseDir) : baseDir;
				const sshFolder = path.join(connectionRoot, '.ssh');
				await mkdir(sshFolder, { recursive: true });
				const sshCommand = buildSshCommand({
					privateKeyPath,
					knownHostsPath: path.join(sshFolder, 'known_hosts'),
				});
				git = simpleGit({ ...options, unsafe: { allowUnsafeSshCommand: true } })
					.env('GIT_SSH_COMMAND', sshCommand)
					.env('GIT_TERMINAL_PROMPT', '0');
			}
			return await operation(git);
		} finally {
			if (temporaryFolder) await rm(temporaryFolder, { recursive: true, force: true });
		}
	}
}
