import { join as posixJoin } from 'node:path/posix';

import {
	CORE_WORKSPACE_TOOL_NAMES,
	createScopedWorkspace,
	reconcileToolResultRuns,
	Workspace,
} from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';

import type { AgentSandboxPrincipalHash } from './agent-sandbox-principal';
import {
	AgentSandboxRuntimeService,
	sanitizeSandboxErrorDetail,
	type AgentSandboxRuntime,
} from './agent-sandbox-runtime.service';
import {
	CHECKPOINT_RECONCILIATION_OVERFLOW,
	N8NCheckpointStorage,
} from './integrations/n8n-checkpoint-storage';

export interface AgentWorkspaceAcquisition {
	workspace: Workspace;
	/** Live sandbox handle, shareable with delegated sub-agent runtimes. */
	handle: AgentSandboxRuntime;
}

@Service()
export class AgentWorkspaceService {
	private readonly pendingReconciliations = new Set<string>();

	constructor(
		private readonly logger: Logger,
		private readonly agentSandboxRuntimeService: AgentSandboxRuntimeService,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly agentsConfig: AgentsConfig,
	) {}

	async getAgentWorkspace(
		projectId: string,
		agentId: string,
		principalHash: AgentSandboxPrincipalHash,
	): Promise<AgentWorkspaceAcquisition> {
		this.agentSandboxRuntimeService.assertSandboxConfiguration(projectId, agentId);
		// The sandbox boots lazily on first filesystem/command use: the scope below
		// creates the workspace root on first I/O, and the filesystem init hook (once
		// per filesystem instance, after the sandbox is ready) only schedules
		// tool-result reconciliation, which tolerates a missing root.
		const runtime = await this.agentSandboxRuntimeService.acquireWorkspaceSandbox(
			projectId,
			agentId,
			principalHash,
			{
				onFilesystemInit: ({ filesystem }) => {
					this.reconcileToolResultsInBackground(
						runtime.cacheKey,
						projectId,
						agentId,
						principalHash,
						createScopedWorkspace(
							new Workspace({ filesystem, sandbox: runtime.sandbox }),
							runtime.workspaceRoot,
						),
					);
				},
			},
		);
		const workspace = createScopedWorkspace(
			new Workspace({ filesystem: runtime.filesystem, sandbox: runtime.sandbox }),
			runtime.workspaceRoot,
			undefined,
			{ ensureRootExists: true },
		);
		return { workspace: this.withCoreToolsOnly(workspace), handle: runtime };
	}

	/**
	 * Scope a delegated sub-agent run into the parent's workspace sandbox under a
	 * per-delegation subdirectory. No acquisition happens here — the shared sandbox
	 * boots on first use, and the subdirectory is created on the scope's first I/O.
	 */
	getDelegatedAgentWorkspace(handle: AgentSandboxRuntime, delegationThreadId: string): Workspace {
		const root = posixJoin(handle.workspaceRoot, 'subagents', delegationThreadId);
		const workspace = createScopedWorkspace(
			new Workspace({ filesystem: handle.filesystem, sandbox: handle.sandbox }),
			root,
			undefined,
			{ ensureRootExists: true },
		);
		return this.withCoreToolsOnly(workspace);
	}

	private withCoreToolsOnly(workspace: Workspace): Workspace {
		const getTools = workspace.getTools.bind(workspace);
		workspace.getTools = () =>
			getTools().filter((tool) => CORE_WORKSPACE_TOOL_NAMES.has(tool.name));
		return workspace;
	}

	private reconcileToolResultsInBackground(
		cacheKey: string,
		projectId: string,
		agentId: string,
		principalHash: AgentSandboxPrincipalHash,
		workspace: Workspace,
	): void {
		if (this.pendingReconciliations.has(cacheKey)) return;
		this.pendingReconciliations.add(cacheKey);

		void (async () => {
			const activeRunIds = await this.checkpointStorage.getActiveRunIdsForSandbox(
				agentId,
				principalHash,
			);
			if (activeRunIds !== CHECKPOINT_RECONCILIATION_OVERFLOW && workspace.filesystem) {
				await reconcileToolResultRuns(
					workspace.filesystem,
					activeRunIds,
					this.agentsConfig.checkpointTtlSeconds * Time.seconds.toMilliseconds,
				);
			}
		})()
			.catch((error) => {
				this.logger.warn('Failed to reconcile agent workspace tool results', {
					projectId,
					agentId,
					error: sanitizeSandboxErrorDetail(error instanceof Error ? error.message : String(error)),
				});
			})
			.finally(() => {
				this.pendingReconciliations.delete(cacheKey);
			});
	}
}
