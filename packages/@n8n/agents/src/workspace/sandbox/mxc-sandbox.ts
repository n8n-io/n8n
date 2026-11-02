import type * as MxcSdkModule from '@microsoft/mxc-sdk/v1';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, promises as fs } from 'node:fs';
import { homedir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';

import { BaseSandbox } from './base-sandbox';
import { SandboxAcquisitionError } from './errors';
import type { Logger } from './logger';
import { toShellCommand } from './shell-command';
import { throwIfAborted } from '../../sdk/abort';
import type { CommandResult, ExecuteCommandOptions, ProviderStatus } from '../types';

type MxcSdk = typeof MxcSdkModule;
type ContainerRequest = MxcSdkModule.ContainerRequest;
type ProcessContainerConfig = MxcSdkModule.ProcessContainerConfig;

/** Upper limit for the stdout and stderr that one command keeps in memory, per stream. */
export const MXC_MAX_OUTPUT_CHARS = 1_000_000;

const TRUNCATED_MARKER = '[output truncated, only the end is kept]\n';

const SAFE_ID = /^[A-Za-z0-9_-]+$/;

const isWindows = process.platform === 'win32';

let mxcSdkPromise: Promise<MxcSdk> | undefined;

/** The SDK is ESM-only, large and ships native binaries, so load it on first use only. */
async function loadMxcSdk(): Promise<MxcSdk> {
	mxcSdkPromise ??= import('@microsoft/mxc-sdk/v1').catch((error: unknown) => {
		mxcSdkPromise = undefined;
		throw new SandboxAcquisitionError(
			'The mxc sandbox provider needs the optional package @microsoft/mxc-sdk, which is not installed.',
			'mxc-sdk-missing',
			{ cause: error },
		);
	});
	return await mxcSdkPromise;
}

export interface MxcSandboxOptions {
	/** Stable id of this workspace. It is also the name of its folder in `workspaceRoot`. */
	id: string;
	/** Parent folder for agent workspaces. Each sandbox gets `<workspaceRoot>/<id>`. */
	workspaceRoot: string;
	/** Host folders that commands can read but not change. */
	readonlyPaths?: string[];
	/** Host folders that commands can never access, added to the default list. */
	deniedPaths?: string[];
	/** Windows only: folder for the MXC denial reports. */
	denialsReportDir?: string;
	timeout?: number;
	env?: Record<string, string>;
	logger?: Logger;
}

/** Credential folders that no agent command needs. They stay denied even under a granted folder. */
function defaultDeniedPaths(): string[] {
	const home = homedir();
	return [
		'.ssh',
		'.aws',
		'.azure',
		'.kube',
		'.docker',
		'.gnupg',
		'.netrc',
		'.npmrc',
		'.git-credentials',
		join('.config', 'gcloud'),
		join('.config', 'gh'),
		join('Library', 'Keychains'),
	].map((path) => join(home, path));
}

/** Interpreter locations that scripts need. Homebrew binaries link into the whole prefix. */
function defaultToolPaths(): string[] {
	if (isWindows) return [];
	return ['/opt/homebrew', '/usr/local'].filter((path) => existsSync(path));
}

export function isPathInside(path: string, root: string): boolean {
	const fromRoot = relative(root, path);
	const outside =
		fromRoot === '..' ||
		fromRoot.startsWith(`..${sep}`) ||
		fromRoot.startsWith(sep) ||
		/^[A-Za-z]:/.test(fromRoot);
	return !outside;
}

/** Keeps the end of the output, because errors and results usually come last. */
function appendCapped(current: string, chunk: string): string {
	const next = current + chunk;
	if (next.length <= MXC_MAX_OUTPUT_CHARS) return next;
	return TRUNCATED_MARKER + next.slice(next.length - MXC_MAX_OUTPUT_CHARS);
}

/**
 * Local workspace sandbox that uses Microsoft Execution Containers (MXC).
 *
 * Each command runs once in its own container that the OS enforces. Only the workspace
 * folder is writable, `readonlyPaths` are readable, credential folders are denied and the
 * network is off. State stays on disk in the workspace folder, not in a container.
 * There is no fallback: if MXC is not available on the host, `start()` fails.
 */
export class MxcSandbox extends BaseSandbox {
	readonly name = 'MxcSandbox';

	readonly provider = 'mxc';

	status: ProviderStatus = 'pending';

	readonly workspaceDir: string;

	readonly readonlyPaths: string[];

	readonly deniedPaths: string[];

	private readonly workspaceRoot: string;

	private readonly timeout: number;

	constructor(private readonly options: MxcSandboxOptions) {
		super();
		if (!SAFE_ID.test(options.id)) {
			throw new Error(`Invalid mxc sandbox id "${options.id}"`);
		}
		this.workspaceRoot = resolve(options.workspaceRoot);
		this.workspaceDir = join(this.workspaceRoot, options.id);
		this.readonlyPaths = (options.readonlyPaths ?? []).map((path) => resolve(path));
		this.deniedPaths = [...defaultDeniedPaths(), ...(options.deniedPaths ?? [])].map((path) =>
			resolve(path),
		);
		this.timeout = options.timeout ?? 300_000;
	}

	get id(): string {
		return this.options.id;
	}

	override async start(): Promise<void> {
		const sdk = await loadMxcSdk();
		const support = sdk.getPlatformSupport();
		if (!support.isSupported) {
			throw new SandboxAcquisitionError(
				`Microsoft Execution Containers are not available on this host: ${support.reason || 'unsupported platform'}`,
				'mxc-unsupported',
			);
		}
		mkdirSync(this.workspaceDir, { recursive: true });
		if (isWindows && this.options.denialsReportDir) {
			mkdirSync(this.options.denialsReportDir, { recursive: true });
		}
	}

	override async stop(): Promise<void> {
		// Each container runs one command, so nothing long-lived stays to stop.
	}

	override async destroy(): Promise<void> {
		// The workspace folder is the agent's persistent scratch space. deleteRemote() removes it.
	}

	/** Deletes the workspace folder, for example when the agent or its owner is deleted. */
	override async deleteRemote(): Promise<void> {
		if (
			this.workspaceDir === this.workspaceRoot ||
			!isPathInside(this.workspaceDir, this.workspaceRoot)
		) {
			return;
		}
		await fs.rm(this.workspaceDir, { recursive: true, force: true });
	}

	override getInstructions(): string {
		return [
			'Local sandbox: each command runs in an OS-enforced Microsoft Execution Container.',
			`Working directory: ${this.workspaceDir}. It is the only folder you can change.`,
			this.readonlyPaths.length > 0
				? `Commands can read these input folders: ${this.readonlyPaths.join(', ')}.`
				: '',
			'Network access is off. Commands cannot access other files on this machine.',
			`Command timeout: ${Math.ceil(this.timeout / 1000)}s.`,
		]
			.filter(Boolean)
			.join(' ');
	}

	override async executeCommand(
		command: string,
		args: string[] = [],
		options?: ExecuteCommandOptions,
	): Promise<CommandResult> {
		const startedAt = Date.now();
		const fail = (stderr: string, extra: Partial<CommandResult> = {}): CommandResult => ({
			command,
			args,
			success: false,
			exitCode: -1,
			stdout: '',
			stderr,
			executionTimeMs: Date.now() - startedAt,
			...extra,
		});

		throwIfAborted(options?.abortSignal);
		await this.ensureRunning({ abortSignal: options?.abortSignal });
		const sdk = await loadMxcSdk();

		if (isWindows && args.length > 0) {
			// cmd.exe does not understand POSIX quoting, so arguments could split into new commands.
			return fail('[mxc] On Windows, pass the command and its arguments as one command line.');
		}
		const workingDirectory = options?.cwd
			? resolve(this.workspaceDir, options.cwd)
			: this.workspaceDir;
		if (!isPathInside(workingDirectory, this.workspaceDir)) {
			return fail(`[mxc] The working directory must be inside ${this.workspaceDir}.`);
		}

		this.prepareScratchFolders();
		const request = this.buildRequest(toShellCommand(command, args), {
			...options,
			cwd: workingDirectory,
		});

		let stdout = '';
		let stderr = '';
		let killed = false;
		try {
			throwIfAborted(options?.abortSignal);
			const handle = await sdk.spawn(request);
			const onAbort = () => {
				killed = true;
				handle.kill();
			};
			options?.abortSignal?.addEventListener('abort', onAbort, { once: true });
			try {
				// An abort that arrived while the container was starting has no event left to fire.
				if (options?.abortSignal?.aborted) onAbort();
				handle.standardOutput?.on('data', (chunk: Buffer | string) => {
					const text = chunk.toString();
					stdout = appendCapped(stdout, text);
					options?.onStdout?.(text);
				});
				handle.standardError?.on('data', (chunk: Buffer | string) => {
					const text = chunk.toString();
					stderr = appendCapped(stderr, text);
					options?.onStderr?.(text);
				});
				const { exitCode, timedOut } = await handle.wait();
				const denialsReport = handle.outputMetadata?.captureDenials?.outputPath;
				if (denialsReport) {
					stderr += `\n[mxc] Denied accesses were recorded in ${denialsReport}`;
				}
				return {
					command,
					args,
					success: exitCode === 0 && !timedOut && !killed,
					exitCode,
					stdout,
					stderr,
					executionTimeMs: Date.now() - startedAt,
					timedOut,
					killed,
				};
			} finally {
				options?.abortSignal?.removeEventListener('abort', onAbort);
				handle.dispose();
			}
		} catch (error) {
			const code = error instanceof sdk.MxcError ? error.code : undefined;
			this.options.logger?.warn('mxc sandbox command could not run', {
				sandboxId: this.id,
				code,
				error: error instanceof Error ? error.message : String(error),
			});
			return fail(`${stderr}${formatMxcError(error, sdk)}`, { stdout, killed });
		}
	}

	/** Builds the MXC container request: the policy that each command runs under. */
	buildRequest(commandLine: string, options?: ExecuteCommandOptions): ContainerRequest {
		const request: ContainerRequest = {
			command: wrapInShell(commandLine),
			workingDirectory: options?.cwd ? resolve(this.workspaceDir, options.cwd) : this.workspaceDir,
			timeoutMs: options?.timeout ?? this.timeout,
			filesystem: {
				readwritePaths: [this.workspaceDir],
				readonlyPaths: [...this.readonlyPaths, ...defaultToolPaths()],
				// The tool prefixes hold interpreters, but their `var` folders hold service data.
				deniedPaths: [
					...this.deniedPaths,
					...defaultToolPaths().map((path) => join(path, 'var')),
				].filter((path) => existsSync(path)),
			},
			network: {
				egress: { default: 'deny' },
				ingress: { default: 'deny', hostLoopback: 'deny' },
			},
			// Never inherit the n8n process environment: it holds secrets such as the encryption key.
			inheritDefaultEnvironment: false,
			environment: this.buildEnvironment(options?.env),
		};
		if (isWindows && this.options.denialsReportDir) {
			const config: ProcessContainerConfig = {
				captureDenials: {
					mode: 'block',
					outputPath: join(this.options.denialsReportDir, `denials-${randomUUID()}.json`),
				},
			};
			request.containment = { type: 'processcontainer', config };
		}
		return request;
	}

	private prepareScratchFolders(): void {
		mkdirSync(join(this.workspaceDir, '.home'), { recursive: true });
		mkdirSync(join(this.workspaceDir, '.tmp'), { recursive: true });
	}

	/**
	 * Builds the command environment from an allowlist. HOME and TMPDIR point to hidden scratch
	 * folders in the workspace, so tool caches do not mix with the agent's files.
	 */
	private buildEnvironment(env: NodeJS.ProcessEnv | undefined): Record<string, string> {
		const scratchHome = join(this.workspaceDir, '.home');
		const scratchTmp = join(this.workspaceDir, '.tmp');
		const merged: Record<string, string | undefined> = {
			PATH: process.env.PATH,
			LANG: process.env.LANG,
			// The container has no desktop access, so GUI plot backends abort.
			MPLBACKEND: 'Agg',
			...this.options.env,
			...env,
			HOME: scratchHome,
			TMPDIR: scratchTmp,
		};
		if (isWindows) {
			// Windows process containers refuse an environment without SYSTEMROOT and LOCALAPPDATA.
			merged.SYSTEMROOT = process.env.SYSTEMROOT;
			merged.WINDIR = process.env.WINDIR;
			merged.COMSPEC = process.env.COMSPEC;
			merged.PATHEXT = process.env.PATHEXT;
			merged.LOCALAPPDATA = process.env.LOCALAPPDATA;
			merged.USERPROFILE = scratchHome;
			merged.TEMP = scratchTmp;
			merged.TMP = scratchTmp;
		}
		return Object.fromEntries(
			Object.entries(merged).filter((entry): entry is [string, string] => entry[1] !== undefined),
		);
	}
}

/** MXC runs `command` through `/bin/sh -c` on macOS and Linux. Windows needs cmd.exe. */
function wrapInShell(commandLine: string): string {
	return isWindows ? `cmd.exe /d /s /c "${commandLine}"` : commandLine;
}

function formatMxcError(error: unknown, sdk: MxcSdk): string {
	if (error instanceof sdk.MxcError) {
		return [
			`[mxc] The command could not run in the sandbox (${error.code}): ${error.message}`,
			error.remediation ? `Remediation: ${error.remediation}` : '',
		]
			.filter(Boolean)
			.join('\n');
	}
	const message = error instanceof Error ? error.message : String(error);
	return `[mxc] The command could not run in the sandbox: ${message}`;
}
