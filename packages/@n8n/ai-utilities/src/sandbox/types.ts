import type { CreateSandboxFromImageParams } from '@daytonaio/sdk';

import type { ErrorReporter, Logger } from './logger';

export {
	BaseFilesystem,
	BaseSandbox,
	ProcessHandle,
	SandboxProcessManager,
} from '@n8n/agents';

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
	ProcessInfo,
	ProviderStatus,
	ReadOptions,
	RemoveOptions,
	SandboxInfo,
	SpawnProcessOptions,
	WorkspaceFilesystem,
	WorkspaceSandbox,
	WriteOptions,
} from '@n8n/agents';

export type SandboxProvider = 'daytona' | 'n8n-sandbox';

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

export type SandboxInstance = import('@n8n/agents').WorkspaceSandbox;
export type SandboxFilesystem = import('@n8n/agents').WorkspaceFilesystem;

export interface CreateSandboxOptions {
	logger?: Logger;
	errorReporter?: ErrorReporter;
}
