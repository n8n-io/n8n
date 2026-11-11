import type { InstanceAiEvalThreadMemoryResponse } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { N8nMemory } from '@/modules/agents/integrations/n8n-memory';

import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';

/**
 * Reads the observational memory of an Assistant agent thread from the Agents
 * tables. The caller checks thread access first.
 */
@Service()
export class AssistantEvalThreadMemoryService {
	constructor(private readonly n8nMemory: N8nMemory) {}

	async getThreadMemory(threadId: string): Promise<InstanceAiEvalThreadMemoryResponse> {
		const memory = this.n8nMemory.getImplementation(ASSISTANT_AGENT_ID);
		// The observer uses the thread id as the observation scope id.
		const [observations, cursor] = await Promise.all([
			memory.getActiveObservationLog({ observationScopeId: threadId, order: 'asc' }),
			memory.getCursor(threadId),
		]);
		return {
			observations: observations.map(({ marker, text, tokenCount }) => ({
				marker,
				text,
				tokenCount,
			})),
			cursor: cursor && {
				lastObservedMessageId: cursor.lastObservedMessageId,
				lastObservedAt: cursor.lastObservedAt.toISOString(),
			},
		};
	}
}
