import {
	CORE_WORKSPACE_TOOL_NAMES,
	createScopedWorkspace,
	getToolResultThreadDirectory,
	Workspace,
} from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Service } from '@n8n/di';

import {
	AgentSandboxRuntimeService,
	sanitizeSandboxErrorDetail,
} from './agent-sandbox-runtime.service';

@Service()
export class AgentWorkspaceService {
	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly logger: Logger,
		private readonly agentSandboxRuntimeService: AgentSandboxRuntimeService,
	) {}

	async getAgentWorkspace(projectId: string, agentId: string): Promise<Workspace> {
		this.agentSandboxRuntimeService.assertSandboxConfiguration(projectId, agentId);
		const runtime = await this.agentSandboxRuntimeService.acquireSandbox(projectId, agentId);
		await runtime.filesystem.mkdir(runtime.workspaceRoot, { recursive: true });
		const workspace = createScopedWorkspace(
			new Workspace({ filesystem: runtime.filesystem, sandbox: runtime.sandbox }),
			runtime.workspaceRoot,
		);
		const getTools = workspace.getTools.bind(workspace);
		workspace.getTools = () =>
			getTools().filter((tool) => CORE_WORKSPACE_TOOL_NAMES.has(tool.name));
		return workspace;
	}

	async cleanupThreadWorkspace(
		projectId: string,
		agentId: string,
		threadId: string,
	): Promise<void> {
		if (!this.agentsConfig.sandboxEnabled) return;

		try {
			const runtime = await this.agentSandboxRuntimeService.acquireSandbox(projectId, agentId);
			await runtime.filesystem.rmdir(
				`${runtime.workspaceRoot}/${getToolResultThreadDirectory(threadId)}`,
				{ recursive: true, force: true },
			);
		} catch (error) {
			this.logger.warn('Failed to clean up agent thread workspace', {
				projectId,
				agentId,
				error: sanitizeSandboxErrorDetail(error instanceof Error ? error.message : String(error)),
			});
		}
	}
}
