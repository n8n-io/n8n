import type { CreateSandboxFromImageParams } from '@daytona/sdk';

import type { BaseFilesystemOptions } from '../filesystem/base-filesystem';
import type {
	BaseSandboxOptions,
	CommandOptions,
	CommandResult,
	CopyOptions,
	ExecuteCommandOptions,
	FileContent,
	FileEntry,
	FileStat,
	ListOptions,
	MountConfig,
	ProcessHandle,
	ProcessInfo,
	ProviderStatus,
	ReadOptions,
	RemoveOptions,
	SandboxInfo,
	SandboxProcessManager,
	SpawnProcessOptions,
	WorkspaceFilesystem,
	WorkspaceSandbox,
	WriteOptions,
} from '../types';
import type { ErrorReporter, Logger } from './logger';

export type {
	BaseFilesystemOptions,
	BaseSandboxOptions,
	CommandOptions,
	CommandResult,
	CopyOptions,
	ExecuteCommandOptions,
	FileContent,
	FileEntry,
	FileStat,
	ListOptions,
	MountConfig,
	ProcessHandle,
	ProcessInfo,
	ProviderStatus,
	ReadOptions,
	RemoveOptions,
	SandboxInfo,
	SandboxProcessManager,
	SpawnProcessOptions,
	WorkspaceFilesystem,
	WorkspaceSandbox,
	WriteOptions,
};

/** Providers that run the workspace in a remote sandbox service. */
export type RemoteSandboxProvider = 'daytona' | 'n8n-sandbox';

/** `mxc` runs agent workspaces on the n8n host. Only agents can opt in to it. */
export type SandboxProvider = RemoteSandboxProvider | 'mxc';

export interface SandboxConfigBase {
	provider: SandboxProvider;
	timeout?: number;
}

export interface DisabledSandboxConfig extends SandboxConfigBase {
	enabled: false;
}

export interface EnabledSandboxConfigBase extends SandboxConfigBase {
	enabled: true;
	/**
	 * When true, the provider deletes the sandbox once it goes idle instead of leaving it
	 * stopped. Used for throwaway sandboxes (e.g. eval runs) so they don't accumulate.
	 * On Daytona this overrides `autoDeleteInterval` (Daytona forces it to 0 when ephemeral).
	 */
	ephemeral?: boolean;
}

export interface DaytonaSandboxConfig extends EnabledSandboxConfigBase {
	provider: 'daytona';
	id?: string;
	name?: string;
	labels?: Record<string, string>;
	daytonaApiUrl?: string;
	daytonaApiKey?: string;
	image?: CreateSandboxFromImageParams['image'];
	snapshot?: string;
	autoStopInterval?: number;
	autoArchiveInterval?: number;
	autoDeleteInterval?: number;
	createTimeoutSeconds?: number;
	getAuthToken?: () => Promise<string>;
	refreshSkewMs?: number;
	logger?: Logger;
}

export interface N8nSandboxConfig extends EnabledSandboxConfigBase {
	provider: 'n8n-sandbox';
	serviceUrl: string;
	apiKey?: string;
	/**
	 * Sandbox id to create or reconnect to. Must be a lowercase UUID — the
	 * sandbox service rejects any other format. When omitted the service
	 * generates a random id, which no other process can rediscover later.
	 */
	id?: string;
}

/**
 * `ephemeral` has no effect for mxc: the workspace folder stays on disk until the sandbox is
 * deleted. It stays in the type because shared callers set it for every provider.
 */
export interface MxcSandboxConfig extends EnabledSandboxConfigBase {
	provider: 'mxc';
	/** Workspace id. It is also the name of the agent's folder in `workspaceRoot`. */
	id: string;
	/** Parent folder for local agent workspaces. */
	workspaceRoot: string;
	/** Host folders that commands can read but not change. */
	readonlyPaths?: string[];
	/** Host folders that commands and file tools can never access. */
	deniedPaths?: string[];
	/** Windows only: folder for the MXC denial reports. */
	denialsReportDir?: string;
	logger?: Logger;
}

export type SandboxConfig =
	| DisabledSandboxConfig
	| DaytonaSandboxConfig
	| N8nSandboxConfig
	| MxcSandboxConfig;

export type SandboxInstance = WorkspaceSandbox;
export type SandboxFilesystem = WorkspaceFilesystem;

export interface CreateSandboxOptions {
	logger?: Logger;
	errorReporter?: ErrorReporter;
}
