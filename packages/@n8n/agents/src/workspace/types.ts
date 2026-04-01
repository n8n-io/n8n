import type { SandboxProcessManager } from './process';

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

export interface MountConfig {
	type: 'local';
	basePath: string;
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
	getMountConfig?(): MountConfig;
}

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

export interface CommandOptions {
	timeout?: number;
	env?: NodeJS.ProcessEnv;
	cwd?: string;
	onStdout?: (data: string) => void;
	onStderr?: (data: string) => void;
	abortSignal?: AbortSignal;
}

export type ExecuteCommandOptions = CommandOptions;

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

export interface WorkspaceSandbox {
	readonly id: string;
	readonly name: string;
	readonly provider: string;
	status: ProviderStatus;
	getInstructions?(): string;
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

export type SpawnProcessOptions = CommandOptions;

export interface ProcessInfo {
	pid: number;
	command?: string;
	exitCode?: number;
}

export { SandboxProcessManager, ProcessHandle } from './process';

export interface BaseSandboxOptions {
	processes?: SandboxProcessManager;
	onStart?: (args: { sandbox: WorkspaceSandbox }) => void | Promise<void>;
	onStop?: (args: { sandbox: WorkspaceSandbox }) => void | Promise<void>;
	onDestroy?: (args: { sandbox: WorkspaceSandbox }) => void | Promise<void>;
}

export interface LocalFilesystemOptions {
	id?: string;
	basePath: string;
	contained?: boolean;
	readOnly?: boolean;
	instructions?: string;
}

export interface LocalSandboxOptions {
	id?: string;
	workingDirectory?: string;
	env?: NodeJS.ProcessEnv;
	timeout?: number;
	instructions?: string;
}

export interface DaytonaSandboxOptions {
	id?: string;
	apiKey?: string;
	apiUrl?: string;
	timeout?: number;
	language?: 'typescript' | 'javascript' | 'python';
	resources?: { cpu?: number; memory?: number; disk?: number };
	env?: Record<string, string>;
	labels?: Record<string, string>;
	snapshot?: string;
	image?: string;
	ephemeral?: boolean;
	autoStopInterval?: number;
	name?: string;
	networkBlockAll?: boolean;
	networkAllowList?: string;
}

export interface WorkspaceConfig {
	id?: string;
	name?: string;
	filesystem?: WorkspaceFilesystem;
	sandbox?: WorkspaceSandbox;
}

export interface MountResult {
	success: boolean;
	mountPath: string;
	error?: string;
}
