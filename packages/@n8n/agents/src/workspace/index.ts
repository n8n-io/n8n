export { Workspace } from './workspace';
export { createScopedWorkspace } from './scoped-workspace';
export {
	getToolResultRunDirectory,
	reconcileToolResultRuns,
	removeToolResultRun,
} from './tool-result-storage';

export { BaseFilesystem } from './filesystem/base-filesystem';

export { BaseSandbox } from './sandbox/base-sandbox';

export { CORE_WORKSPACE_TOOL_NAMES, createWorkspaceTools } from './tools/workspace-tools';
export { callLifecycle } from './lifecycle';

export type { BaseFilesystemOptions, FilesystemLifecycleHook } from './filesystem/base-filesystem';

export type {
	WorkspaceFilesystem,
	WorkspaceSandbox,
	WorkspaceConfig,
	CommandResult,
	CommandOptions,
	ExecuteCommandOptions,
	FileContent,
	FileStat,
	FileEntry,
	AbortableOptions,
	AppendOptions,
	ReadOptions,
	WriteOptions,
	ListOptions,
	RemoveOptions,
	CopyOptions,
	MkdirOptions,
	ProviderStatus,
	SandboxInfo,
	LocalFilesystemOptions,
	LocalSandboxOptions,
	DaytonaSandboxOptions,
	BaseSandboxOptions,
	MountConfig,
	MountResult,
	SpawnProcessOptions,
	ProcessInfo,
} from './types';
export { SandboxProcessManager, ProcessHandle } from './process';
