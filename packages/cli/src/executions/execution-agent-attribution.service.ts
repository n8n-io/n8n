import type { ExecutionAgentRun } from '@n8n/api-types';
import { AgentsConfig } from '@n8n/config';
import { ServiceAccountRepository, type User } from '@n8n/db';
import { Service } from '@n8n/di';
import type { ExecutionSummary, IRunExecutionData, WorkflowExecuteMode } from 'n8n-workflow';

import { userHasScopes } from '@/permissions.ee/check-access';
import { AgentDirectory } from '@/services/agent-directory';

/**
 * Names the agent that started an execution through a workflow tool, so the
 * editor can show "Run by agent". The workflow tool stamps the agent's service
 * account on the run data (`parentAgentRun`). The account takes the agent's name.
 */
@Service()
export class ExecutionAgentAttributionService {
	constructor(
		private readonly agentsConfig: AgentsConfig,
		private readonly serviceAccountRepository: ServiceAccountRepository,
		private readonly agentDirectory: AgentDirectory,
	) {}

	/**
	 * Adds the agent to each summary that an agent's workflow tool started. The
	 * name and project stay `null` when the viewer cannot read the agent, so the
	 * list does not name agents of other projects.
	 */
	async addAgents(user: User, summaries: ExecutionSummary[]): Promise<void> {
		if (!this.agentsConfig.runtimeIdentityEnabled) return;
		const agentIds = [...new Set(summaries.flatMap((s) => (s.agentId ? [s.agentId] : [])))];
		if (agentIds.length === 0) return;

		const agents = await this.agentDirectory.findAgents(agentIds);
		const readable = new Map<string, boolean>();
		const canRead = async (projectId: string) => {
			let allowed = readable.get(projectId);
			if (allowed === undefined) {
				allowed = await userHasScopes(user, ['agent:read'], false, { projectId });
				readable.set(projectId, allowed);
			}
			return allowed;
		};

		for (const summary of summaries) {
			if (!summary.agentId) continue;
			const agent = agents.get(summary.agentId);
			const visible = agent !== undefined && (await canRead(agent.projectId));
			summary.agent = {
				id: summary.agentId,
				name: visible ? agent.name : null,
				projectId: visible ? agent.projectId : null,
			};
		}
	}

	async describe(
		data: IRunExecutionData | undefined,
		mode: WorkflowExecuteMode,
	): Promise<ExecutionAgentRun | undefined> {
		if (!this.agentsConfig.runtimeIdentityEnabled) return undefined;
		// A retry copies the run data of the original execution, but its caller starts it.
		if (mode === 'retry') return undefined;
		const run = data?.parentAgentRun;
		if (!run?.agentServiceAccountId) return undefined;

		const names = await this.serviceAccountRepository.findNames([run.agentServiceAccountId]);
		const agentName = names.get(run.agentServiceAccountId);
		// The agent was deleted, and its account with it.
		if (agentName === undefined) return undefined;

		return {
			agentId: run.agentId,
			agentName,
			projectId: run.projectId,
			...(run.delegatingAgentId ? { delegatingAgentId: run.delegatingAgentId } : {}),
		};
	}
}
