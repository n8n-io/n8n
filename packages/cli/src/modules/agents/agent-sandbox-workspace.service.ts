import type { Sandbox } from '@daytona/sdk';
import {
	Workspace,
	type CommandResult,
	type ExecuteCommandOptions,
	type FileContent,
	type FileEntry,
	type FileStat,
	type WorkspaceFilesystem,
	type WorkspaceSandbox,
} from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import { AgentKnowledgeSandboxService } from './agent-knowledge-sandbox.service';

export type AgentSandboxRuntimeCapability = {
	available: boolean;
	version?: string;
	error?: string;
};

export type AgentSandboxRuntimeCapabilities = {
	node: AgentSandboxRuntimeCapability;
	tsx: AgentSandboxRuntimeCapability;
	python3: AgentSandboxRuntimeCapability;
};

export type AgentSandboxWorkspaceContext = {
	workspace: Workspace;
	capabilities: AgentSandboxRuntimeCapabilities;
};

type DaytonaCommandResult = {
	exitCode: number;
	result?: string;
	artifacts?: { stdout?: string; stderr?: string };
};

const PROBE_TIMEOUT_MS = 10_000;

function shellEscape(value: string): string {
	return /^[A-Za-z0-9_./:=@+-]+$/.test(value) ? value : `'${value.replace(/'/g, "'\\''")}'`;
}

function toShellCommand(command: string, args: string[] = []): string {
	if (args.length === 0) return command;
	return [command, ...args.map(shellEscape)].join(' ');
}

function compactEnv(env: NodeJS.ProcessEnv | undefined): Record<string, string> | undefined {
	if (!env) return undefined;

	const compacted: Record<string, string> = {};
	for (const [key, value] of Object.entries(env)) {
		if (value !== undefined) compacted[key] = value;
	}
	return compacted;
}

function sandboxOutput(result: DaytonaCommandResult) {
	return {
		stdout: result.artifacts?.stdout ?? result.result ?? '',
		stderr:
			result.artifacts &&
			'stderr' in result.artifacts &&
			typeof result.artifacts.stderr === 'string'
				? result.artifacts.stderr
				: '',
	};
}

function toCapability(result: CommandResult): AgentSandboxRuntimeCapability {
	const output = result.stdout.trim() || result.stderr.trim();
	if (result.exitCode === 0) {
		return {
			available: true,
			...(output ? { version: output.split('\n')[0] } : {}),
		};
	}

	return {
		available: false,
		error: output || `exitCode=${result.exitCode}`,
	};
}

@Service()
export class AgentSandboxWorkspaceService {
	constructor(
		private readonly knowledgeSandboxService: AgentKnowledgeSandboxService,
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
	) {}

	async createWorkspace(
		projectId: string,
		agentId: string,
		userId: string,
		sandboxScopeId: string = userId,
	): Promise<AgentSandboxWorkspaceContext> {
		const sandbox = await this.knowledgeSandboxService.acquireSandboxForAgent(
			projectId,
			agentId,
			userId,
			sandboxScopeId,
		);
		const workspace = new Workspace({
			id: `agent-sandbox-${agentId}`,
			name: `Agent sandbox ${agentId}`,
			filesystem: this.toWorkspaceFilesystem(sandbox),
			sandbox: this.toWorkspaceSandbox(sandbox),
		});
		const capabilities = await this.probeRuntimeCapabilities(workspace);
		this.logger.debug('Agent sandbox runtime capabilities', { projectId, agentId, capabilities });

		return { workspace, capabilities };
	}

	async probeRuntimeCapabilities(workspace: Workspace): Promise<AgentSandboxRuntimeCapabilities> {
		const [node, tsx, python3] = await Promise.all([
			this.probeRuntime(workspace, 'node', ['--version']),
			this.probeRuntime(workspace, 'npx', ['tsx', '--version']),
			this.probeRuntime(workspace, 'python3', ['--version']),
		]);

		return { node, tsx, python3 };
	}

	private toWorkspaceSandbox(sandbox: Sandbox): WorkspaceSandbox {
		const timeoutSeconds = Math.ceil(this.agentsConfig.sandboxTimeout / 1000);
		return {
			id: sandbox.id,
			name: sandbox.name,
			provider: 'daytona',
			status: 'ready',
			executeCommand: async (
				command: string,
				args: string[] = [],
				options?: ExecuteCommandOptions,
			): Promise<CommandResult> => {
				const startedAt = Date.now();
				const result = await sandbox.process.executeCommand(
					toShellCommand(command, args),
					options?.cwd,
					compactEnv(options?.env),
					Math.ceil((options?.timeout ?? this.agentsConfig.sandboxTimeout) / 1000) ||
						timeoutSeconds,
				);
				const output = sandboxOutput(result);
				if (output.stdout) options?.onStdout?.(output.stdout);
				if (output.stderr) options?.onStderr?.(output.stderr);

				return {
					command,
					args,
					success: result.exitCode === 0,
					exitCode: result.exitCode,
					stdout: output.stdout,
					stderr: output.stderr,
					executionTimeMs: Date.now() - startedAt,
				};
			},
			getInstructions: () =>
				'Cloud sandbox with runtime skill files. Use workspace_execute_command for explicit skill commands.',
		};
	}

	private toWorkspaceFilesystem(sandbox: Sandbox): WorkspaceFilesystem {
		return {
			id: `agent-sandbox-fs-${sandbox.id}`,
			name: 'AgentSandboxFilesystem',
			provider: 'daytona',
			status: 'ready',
			readFile: async (path, options) => {
				const buffer = await sandbox.fs.downloadFile(path);
				return options?.encoding ? buffer.toString(options.encoding) : buffer;
			},
			writeFile: async (path, content) => {
				await sandbox.fs.uploadFiles([{ source: toBuffer(content), destination: path }]);
			},
			appendFile: async (path, content) => {
				let existing: Buffer<ArrayBufferLike> = Buffer.alloc(0);
				try {
					existing = await sandbox.fs.downloadFile(path);
				} catch {}
				await sandbox.fs.uploadFile(Buffer.concat([existing, toBuffer(content)]), path);
			},
			deleteFile: async (path, options) => await sandbox.fs.deleteFile(path, options?.recursive),
			copyFile: async (src, dest) =>
				await sandbox.fs.uploadFile(await sandbox.fs.downloadFile(src), dest),
			moveFile: async (src, dest) => await sandbox.fs.moveFiles(src, dest),
			mkdir: async (path) => await sandbox.fs.createFolder(path, '755'),
			rmdir: async (path, options) =>
				await sandbox.fs.deleteFile(path, options?.recursive ?? false),
			readdir: async (path): Promise<FileEntry[]> => {
				const files = await sandbox.fs.listFiles(path);
				return files.map((file) => ({
					name: file.name ?? '',
					type: file.isDir ? 'directory' : 'file',
					size: file.size,
				}));
			},
			exists: async (path) => {
				try {
					await sandbox.fs.getFileDetails(path);
					return true;
				} catch {
					return false;
				}
			},
			stat: async (path): Promise<FileStat> => {
				const info = await sandbox.fs.getFileDetails(path);
				return {
					name: info.name ?? path.split('/').pop() ?? '',
					path,
					type: info.isDir ? 'directory' : 'file',
					size: info.size ?? 0,
					createdAt: new Date(info.modTime ?? 0),
					modifiedAt: new Date(info.modTime ?? 0),
				};
			},
		};
	}

	private async probeRuntime(
		workspace: Workspace,
		command: string,
		args: string[],
	): Promise<AgentSandboxRuntimeCapability> {
		const result = await workspace.sandbox?.executeCommand?.(command, args, {
			timeout: PROBE_TIMEOUT_MS,
		});
		if (!result) return { available: false, error: 'Sandbox command execution is unavailable' };
		return toCapability(result);
	}
}

function toBuffer(content: FileContent): Buffer {
	return typeof content === 'string' ? Buffer.from(content, 'utf-8') : Buffer.from(content);
}
