import type { AgentSessionStopResponse } from '@n8n/api-types';
import { ExecutionsConfig } from '@n8n/config';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentExecutionService } from './agent-execution.service';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { SystemAgentRegistry } from './system-agents/system-agent-registry';
import { threadBelongsTo } from './utils/agent-thread-access';

@Service()
export class AgentSessionStopService {
	constructor(
		private readonly executionService: AgentExecutionService,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly publisher: Publisher,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly systemAgents: SystemAgentRegistry,
	) {}

	async stopSession(
		projectId: string,
		agentId: string,
		threadId: string,
		userId: string,
	): Promise<AgentSessionStopResponse> {
		const thread = await this.executionService.findThreadById(threadId);
		if (
			!thread ||
			this.systemAgents.has(agentId) ||
			!threadBelongsTo(thread, projectId, agentId, userId)
		) {
			throw new NotFoundError('Session not found');
		}

		const running = await this.executionRepository.findRunningByThread(threadId, {});
		const executionIds = running.map(({ id }) => id);
		if (executionIds.length === 0) return { cancelRequested: false };

		this.onStopSession({ executionIds });
		if (this.executionsConfig.mode === 'queue') {
			await this.publisher.publishCommand({
				command: 'stop-agent-session',
				payload: { executionIds },
			});
		}
		return { cancelRequested: true };
	}

	@OnPubSubEvent('stop-agent-session')
	onStopSession({ executionIds }: PubSubCommandMap['stop-agent-session']): void {
		for (const executionId of executionIds) this.executionService.stopExecution(executionId);
	}
}
