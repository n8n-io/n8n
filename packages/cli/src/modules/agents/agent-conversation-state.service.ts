import type { SerializableAgentState } from '@n8n/agents';
import { Service } from '@n8n/di';

import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';

@Service()
export class AgentConversationStateService {
	constructor(
		private readonly executionRepository: AgentExecutionRepository,
		private readonly checkpointStorage: N8NCheckpointStorage,
	) {}

	/** Read the current records. The resume claim still controls which attempt can proceed. */
	async inspect(
		agentId: string,
		threadId: string,
	): Promise<{ running: boolean; suspendedCheckpoint: SerializableAgentState | null }> {
		const [running, suspendedCheckpoint] = await Promise.all([
			this.executionRepository.existsRunningByThread(threadId),
			this.checkpointStorage.findSuspendedForThread(agentId, threadId),
		]);
		return { running, suspendedCheckpoint };
	}

	/**
	 * Whether the run behind a parked tool call can still be resumed. A click on
	 * a card whose run has expired or was already resolved must not start one.
	 */
	async isResumable(agentId: string, runId: string): Promise<boolean> {
		const { status } = await this.checkpointStorage.getStatus(runId, agentId);
		return status === 'active';
	}
}
