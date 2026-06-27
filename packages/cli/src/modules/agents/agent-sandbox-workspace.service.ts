import type { Sandbox } from '@daytona/sdk';
import {
	Workspace,
	type CommandResult,
	type ExecuteCommandOptions,
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
