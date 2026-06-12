import type { CreateSandboxFromImageParams } from '@daytonaio/sdk';

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

export type SandboxProvider = 'daytona' | 'n8n-sandbox' | 'local';

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

export interface LocalSandboxConfig extends SandboxConfigBase {
	enabled: true;
	provider: 'local';
	/** Host directory used as the workspace root; defaults to an OS temp dir. */
	workspaceRoot?: string;
	env?: NodeJS.ProcessEnv;
}

export type SandboxConfig =
	| DisabledSandboxConfig
	| DaytonaSandboxConfig
	| N8nSandboxConfig
	| LocalSandboxConfig;

export type SandboxInstance = WorkspaceSandbox;
export type SandboxFilesystem = WorkspaceFilesystem;

export interface CreateSandboxOptions {
	logger?: Logger;
	errorReporter?: ErrorReporter;
}
