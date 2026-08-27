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
} from './agent-sandbox-runtime.service';
import {
	CHECKPOINT_RECONCILIATION_OVERFLOW,
	N8NCheckpointStorage,
} from './integrations/n8n-checkpoint-storage';

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
	): Promise<Workspace> {
		this.agentSandboxRuntimeService.assertSandboxConfiguration(projectId, agentId);
		// The sandbox boots lazily on first filesystem/command use, so workspace-root
		// creation and tool-result reconciliation run in the filesystem init hook
		// (once per filesystem instance, after the sandbox is ready) instead of eagerly here.
		const runtime = await this.agentSandboxRuntimeService.acquireWorkspaceSandbox(
			projectId,
			agentId,
			principalHash,
			{
				onFilesystemInit: async ({ filesystem }) => {
					await filesystem.mkdir(runtime.workspaceRoot, { recursive: true });
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
		);
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
