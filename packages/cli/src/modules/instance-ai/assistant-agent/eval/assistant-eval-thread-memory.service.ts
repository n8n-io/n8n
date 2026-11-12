import type { InstanceAiEvalThreadMemoryResponse } from '@n8n/api-types';
import { Service } from '@n8n/di';

import { SystemAgentEvalService } from '@/modules/agents/system-agents/system-agent-eval.service';

import { ASSISTANT_AGENT_ID } from '../assistant-turn-options';

/**
 * Reads the observational memory of an Assistant agent thread from the Agents
 * tables. The caller checks thread access first.
 */
@Service()
export class AssistantEvalThreadMemoryService {
	constructor(private readonly systemAgentEval: SystemAgentEvalService) {}

	async getThreadMemory(threadId: string): Promise<InstanceAiEvalThreadMemoryResponse> {
		const { observations, cursor } = await this.systemAgentEval.getThreadMemory(
			ASSISTANT_AGENT_ID,
			threadId,
		);
		return {
			observations,
			cursor: cursor && {
				lastObservedMessageId: cursor.lastObservedMessageId,
				lastObservedAt: cursor.lastObservedAt.toISOString(),
			},
		};
	}
}
