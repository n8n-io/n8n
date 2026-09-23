import type { SerializableAgentState } from '@n8n/agents';
import { Service } from '@n8n/di';

import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';

@Service()
export class AgentConversationStateService {
	constructor(private readonly checkpointStorage: N8NCheckpointStorage) {}

	/**
	 * Read the current records. The session lease decides which turn can run,
	 * and the resume claim decides which resume attempt can proceed.
	 */
	async inspect(
		agentId: string,
		threadId: string,
	): Promise<{ suspendedCheckpoint: SerializableAgentState | null }> {
		const suspendedCheckpoint = await this.checkpointStorage.findSuspendedForThread(
			agentId,
			threadId,
		);
		return { suspendedCheckpoint };
	}
}
