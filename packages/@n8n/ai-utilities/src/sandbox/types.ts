import type { CreateSandboxFromImageParams } from '@daytonaio/sdk';

import type { ErrorReporter, Logger } from './logger';

export type SandboxProvider = 'daytona' | 'n8n-sandbox';

export type ProviderStatus =
	| 'pending'
	| 'initializing'
	| 'ready'
	| 'starting'
	| 'running'
	| 'stopping'
	| 'stopped'
	| 'destroying'
	| 'destroyed'
	| 'error';

export type FileContent = string | Buffer | Uint8Array;

export interface FileEntry {
	name: string;
	type: 'file' | 'directory';
	size?: number;
}

export interface FileStat {
	name: string;
	path: string;
	type: 'file' | 'directory';
	size: number;
	createdAt: Date;
	modifiedAt: Date;
}

export interface ReadOptions {
	encoding?: BufferEncoding;
}

export interface WriteOptions {
	recursive?: boolean;
	overwrite?: boolean;
}

export interface ListOptions {
	recursive?: boolean;
	extension?: string;
}

export interface RemoveOptions {
	recursive?: boolean;
	force?: boolean;
}

export interface CopyOptions {
	overwrite?: boolean;
	recursive?: boolean;
}

export interface CommandOptions {
	timeout?: number;
	env?: NodeJS.ProcessEnv;
	cwd?: string;
	onStdout?: (data: string) => void;
	onStderr?: (data: string) => void;
	abortSignal?: AbortSignal;
}

export type ExecuteCommandOptions = CommandOptions;

export interface CommandResult {
	success: boolean;
	exitCode: number;
	stdout: string;
	stderr: string;
	executionTimeMs: number;
	timedOut?: boolean;
	killed?: boolean;
	command?: string;
	args?: string[];
}

export interface SandboxInfo {
	id: string;
	name: string;
	provider: string;
	status: ProviderStatus;
	createdAt?: Date;
	resources?: {
		memoryMB?: number;
		cpuCores?: number;
	};
	metadata?: Record<string, unknown>;
}

export type SpawnProcessOptions = CommandOptions;

export interface ProcessHandle {
	readonly pid: number;
	readonly exitCode: number | undefined;
	command?: string;
	kill(): Promise<boolean>;
	sendStdin(data: string): Promise<void>;
	wait(options?: {
		onStdout?: (data: string) => void;
		onStderr?: (data: string) => void;
	}): Promise<CommandResult>;
}

export interface SandboxProcessManager {
	spawn(command: string, options?: SpawnProcessOptions): Promise<ProcessHandle>;
	list(): Promise<Array<{ pid: number; command?: string; exitCode?: number }>>;
	get(pid: number): Promise<ProcessHandle | undefined>;
	kill(pid: number): Promise<boolean>;
}

export interface WorkspaceSandbox {
	readonly id: string;
	readonly name: string;
	readonly provider: string;
	status: ProviderStatus;
	getInstructions?(): string;
	getDefaultCommandEnv?(): NodeJS.ProcessEnv;
	executeCommand?(
		command: string,
		args?: string[],
		options?: ExecuteCommandOptions,
	): Promise<CommandResult>;
	readonly processes?: SandboxProcessManager;
	start?(): Promise<void>;
	stop?(): Promise<void>;
	destroy?(): Promise<void>;
	_start?(): Promise<void>;
	_stop?(): Promise<void>;
	_destroy?(): Promise<void>;
}

export interface WorkspaceFilesystem {
	readonly id: string;
	readonly name: string;
	readonly provider: string;
	readonly readOnly?: boolean;
	readonly basePath?: string;
	status: ProviderStatus;
	readFile(path: string, options?: ReadOptions): Promise<string | Buffer>;
	writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void>;
	appendFile(path: string, content: FileContent): Promise<void>;
	deleteFile(path: string, options?: RemoveOptions): Promise<void>;
	copyFile(src: string, dest: string, options?: CopyOptions): Promise<void>;
	moveFile(src: string, dest: string, options?: CopyOptions): Promise<void>;
	mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
	rmdir(path: string, options?: RemoveOptions): Promise<void>;
	readdir(path: string, options?: ListOptions): Promise<FileEntry[]>;
	exists(path: string): Promise<boolean>;
	stat(path: string): Promise<FileStat>;
	init?(): Promise<void>;
	destroy?(): Promise<void>;
	_init?(): Promise<void>;
	_destroy?(): Promise<void>;
	getInstructions?(): string;
}

export interface BaseSandboxOptions {
	processes?: SandboxProcessManager;
	onStart?: (args: { sandbox: WorkspaceSandbox }) => void | Promise<void>;
	onStop?: (args: { sandbox: WorkspaceSandbox }) => void | Promise<void>;
	onDestroy?: (args: { sandbox: WorkspaceSandbox }) => void | Promise<void>;
}

export interface BaseFilesystemOptions {
	onInit?: (args: { filesystem: WorkspaceFilesystem }) => void | Promise<void>;
	onDestroy?: (args: { filesystem: WorkspaceFilesystem }) => void | Promise<void>;
}

export interface SandboxConfigBase {
	provider: SandboxProvider;
	timeout?: number;
}

export interface DisabledSandboxConfig extends SandboxConfigBase {
	enabled: false;
}

export interface DaytonaSandboxConfig extends SandboxConfigBase {
	enabled: true;
	provider: 'daytona';
	id?: string;
	name?: string;
	labels?: Record<string, string>;
	daytonaApiUrl?: string;
	daytonaApiKey?: string;
	image?: CreateSandboxFromImageParams['image'];
	snapshot?: string;
	n8nVersion?: string;
	namePrefix?: string;
	createTimeoutSeconds?: number;
	getAuthToken?: () => Promise<string>;
	refreshSkewMs?: number;
	logger?: Logger;
}

export interface N8nSandboxConfig extends SandboxConfigBase {
	enabled: true;
	provider: 'n8n-sandbox';
	serviceUrl: string;
	apiKey?: string;
}

export type SandboxConfig = DisabledSandboxConfig | DaytonaSandboxConfig | N8nSandboxConfig;

export type SandboxInstance = WorkspaceSandbox;
export type SandboxFilesystem = WorkspaceFilesystem;

export interface CreateSandboxOptions {
	logger?: Logger;
	errorReporter?: ErrorReporter;
}

export function shellQuote(arg: string): string {
	if (/^[a-zA-Z0-9._\-/=:@]+$/.test(arg)) return arg;
	return `'${arg.replace(/'/g, "'\\''")}'`;
}

export abstract class BaseSandbox implements WorkspaceSandbox {
	abstract readonly id: string;
	abstract readonly name: string;
	abstract readonly provider: string;
	status: ProviderStatus = 'pending';
	readonly processes?: SandboxProcessManager;

	private startPromise?: Promise<void>;
	private stopPromise?: Promise<void>;
	private destroyPromise?: Promise<void>;
	private readonly onStartHook?: (args: { sandbox: WorkspaceSandbox }) => void | Promise<void>;
	private readonly onStopHook?: (args: { sandbox: WorkspaceSandbox }) => void | Promise<void>;
	private readonly onDestroyHook?: (args: { sandbox: WorkspaceSandbox }) => void | Promise<void>;

	constructor(options?: BaseSandboxOptions) {
		if (options?.processes) {
			(this as { processes: SandboxProcessManager }).processes = options.processes;
		}
		this.onStartHook = options?.onStart;
		this.onStopHook = options?.onStop;
		this.onDestroyHook = options?.onDestroy;
	}

	abstract start(): Promise<void>;
	abstract stop(): Promise<void>;
	abstract destroy(): Promise<void>;

	async _start(): Promise<void> {
		if (this.status === 'running') return;
		if (this.stopPromise) await this.stopPromise;
		if (this.destroyPromise) await this.destroyPromise;
		if (this.status === 'destroyed') throw new Error('Cannot start a destroyed sandbox');
		if (this.startPromise) return await this.startPromise;

		this.startPromise = this.executeStart();
		try {
			await this.startPromise;
		} finally {
			this.startPromise = undefined;
		}
	}

	async _stop(): Promise<void> {
		if (this.status === 'stopped' || this.status === 'pending') return;
		if (this.status === 'destroyed' || this.status === 'destroying') return;
		if (this.startPromise) await this.startPromise.catch(() => {});
		if (this.stopPromise) return await this.stopPromise;

		this.stopPromise = this.executeStop();
		try {
			await this.stopPromise;
		} finally {
			this.stopPromise = undefined;
		}
	}

	async _destroy(): Promise<void> {
		if (this.status === 'destroyed') return;
		if (this.status === 'pending') {
			this.status = 'destroyed';
			return;
		}
		if (this.startPromise) await this.startPromise.catch(() => {});
		if (this.stopPromise) await this.stopPromise.catch(() => {});
		if (this.destroyPromise) return await this.destroyPromise;

		this.destroyPromise = this.executeDestroy();
		try {
			await this.destroyPromise;
		} finally {
			this.destroyPromise = undefined;
		}
	}

	protected markNeedsStart(): void {
		if (this.status === 'destroyed' || this.status === 'destroying') return;
		this.status = 'pending';
	}

	async ensureRunning(): Promise<void> {
		if (this.status === 'destroyed') {
			throw new Error(`Sandbox "${this.name}" has been destroyed`);
		}
		if (this.status === 'destroying') {
			if (this.destroyPromise) await this.destroyPromise.catch(() => {});
			throw new Error(`Sandbox "${this.name}" has been destroyed`);
		}
		if (this.status === 'stopping') {
			if (this.stopPromise) await this.stopPromise.catch(() => {});
		}
		if (this.status !== 'running') await this._start();
		if (this.status !== 'running') {
			throw new Error(`Sandbox "${this.name}" failed to start (status: ${this.status})`);
		}
	}

	async executeCommand(
		command: string,
		args?: string[],
		options?: ExecuteCommandOptions,
	): Promise<CommandResult> {
		await this.ensureRunning();
		if (!this.processes) throw new Error(`Sandbox "${this.name}" has no process manager`);
		const fullCommand = args?.length ? `${command} ${args.map(shellQuote).join(' ')}` : command;
		const handle = await this.processes.spawn(fullCommand, options);
		return await handle.wait({ onStdout: options?.onStdout, onStderr: options?.onStderr });
	}

	getInstructions(): string {
		return '';
	}

	private async executeStart(): Promise<void> {
		this.status = 'starting';
		try {
			await this.start();
			this.status = 'running';
			try {
				await this.onStartHook?.({ sandbox: this });
			} catch {
				// Non-fatal: bad callback should not kill a healthy sandbox.
			}
		} catch (error) {
			this.status = 'error';
			throw error;
		}
	}

	private async executeStop(): Promise<void> {
		this.status = 'stopping';
		try {
			try {
				await this.onStopHook?.({ sandbox: this });
			} catch {
				// Non-fatal.
			}
			await this.stop();
			this.status = 'stopped';
		} catch (error) {
			this.status = 'error';
			throw error;
		}
	}

	private async executeDestroy(): Promise<void> {
		this.status = 'destroying';
		try {
			try {
				await this.onDestroyHook?.({ sandbox: this });
			} catch {
				// Non-fatal.
			}
			await this.destroy();
			this.status = 'destroyed';
		} catch (error) {
			this.status = 'error';
			throw error;
		}
	}
}

export abstract class BaseFilesystem implements WorkspaceFilesystem {
	abstract readonly id: string;
	abstract readonly name: string;
	abstract readonly provider: string;
	abstract status: ProviderStatus;
	error?: string;

	private initPromise?: Promise<void>;
	private destroyPromise?: Promise<void>;
	private readonly onInitHook?: (args: { filesystem: WorkspaceFilesystem }) => void | Promise<void>;
	private readonly onDestroyHook?: (args: {
		filesystem: WorkspaceFilesystem;
	}) => void | Promise<void>;

	constructor(options?: BaseFilesystemOptions) {
		this.onInitHook = options?.onInit;
		this.onDestroyHook = options?.onDestroy;
	}

	async _init(): Promise<void> {
		if (
			this.status === 'ready' ||
			this.status === 'destroying' ||
			this.status === 'destroyed' ||
			this.status === 'error'
		) {
			return;
		}
		if (this.initPromise) return await this.initPromise;

		this.initPromise = this.executeInit();
		try {
			await this.initPromise;
		} finally {
			this.initPromise = undefined;
		}
	}

	async init(): Promise<void> {}

	protected async ensureReady(): Promise<void> {
		if (this.status !== 'ready') await this._init();
		if (this.status !== 'ready') {
			throw new Error(`Filesystem "${this.id}" is not ready (status: ${this.status})`);
		}
	}

	async _destroy(): Promise<void> {
		if (this.status === 'destroyed') return;
		if (this.status === 'pending') {
			this.status = 'destroyed';
			return;
		}
		if (this.destroyPromise) return await this.destroyPromise;

		this.destroyPromise = this.executeDestroy();
		try {
			await this.destroyPromise;
		} finally {
			this.destroyPromise = undefined;
		}
	}

	async destroy(): Promise<void> {}

	abstract readFile(path: string, options?: ReadOptions): Promise<string | Buffer>;
	abstract writeFile(path: string, content: FileContent, options?: WriteOptions): Promise<void>;
	abstract appendFile(path: string, content: FileContent): Promise<void>;
	abstract deleteFile(path: string, options?: RemoveOptions): Promise<void>;
	abstract copyFile(src: string, dest: string, options?: CopyOptions): Promise<void>;
	abstract moveFile(src: string, dest: string, options?: CopyOptions): Promise<void>;
	abstract mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
	abstract rmdir(path: string, options?: RemoveOptions): Promise<void>;
	abstract readdir(path: string, options?: ListOptions): Promise<FileEntry[]>;
	abstract exists(path: string): Promise<boolean>;
	abstract stat(path: string): Promise<FileStat>;

	private async executeInit(): Promise<void> {
		this.status = 'initializing';
		this.error = undefined;
		try {
			await this.init();
			this.status = 'ready';
			try {
				await this.onInitHook?.({ filesystem: this });
			} catch {
				// Non-fatal: bad callback should not kill a healthy filesystem.
			}
		} catch (error) {
			this.status = 'error';
			this.error = error instanceof Error ? error.message : String(error);
			throw error;
		}
	}

	private async executeDestroy(): Promise<void> {
		if (this.initPromise) await this.initPromise.catch(() => {});
		this.status = 'destroying';
		try {
			try {
				await this.onDestroyHook?.({ filesystem: this });
			} catch {
				// Non-fatal.
			}
			await this.destroy();
			this.status = 'destroyed';
		} catch (error) {
			this.status = 'error';
			this.error = error instanceof Error ? error.message : String(error);
			throw error;
		}
	}
}
