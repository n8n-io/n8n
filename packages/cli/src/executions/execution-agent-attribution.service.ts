import type { ExecutionAgentRun } from '@n8n/api-types';
import { AgentsConfig } from '@n8n/config';
import { ServiceAccountRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { IRunExecutionData, WorkflowExecuteMode } from 'n8n-workflow';

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
	) {}

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
