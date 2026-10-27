import type { AgentSessionStopResponse } from '@n8n/api-types';
import { ExecutionsConfig } from '@n8n/config';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentExecutionService } from './agent-execution.service';
import { AgentChatExecutionService } from './agent-chat-execution.service';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { SystemAgentRegistry } from './system-agents/system-agent-registry';

@Service()
export class AgentSessionStopService {
	constructor(
		private readonly executionService: AgentExecutionService,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly publisher: Publisher,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly systemAgents: SystemAgentRegistry,
		private readonly chatExecutionService: AgentChatExecutionService,
	) {}

	async stopSession(
		projectId: string,
		agentId: string,
		threadId: string,
		userId: string,
	): Promise<AgentSessionStopResponse> {
		const thread = await this.executionService.findAccessibleThreadById(
			threadId,
			projectId,
			agentId,
			userId,
		);
		if (!thread || this.systemAgents.has(agentId)) {
			throw new NotFoundError('Session not found');
		}

		const running = await this.executionRepository.findRunningByThread(threadId, {});
		const executionIds = running.map(({ id }) => id);
		if (executionIds.length === 0) return { cancelRequested: false };

		const payload = { agentId, threadId, executionIds };
		try {
			await this.onStopSession(payload);
		} finally {
			if (this.executionsConfig.mode === 'queue') {
				await this.publisher.publishCommand({
					command: 'stop-agent-session',
					payload,
				});
			}
		}
		return { cancelRequested: true };
	}

	@OnPubSubEvent('stop-agent-session')
	async onStopSession({
		agentId,
		threadId,
		executionIds,
	}: PubSubCommandMap['stop-agent-session']): Promise<void> {
		for (const executionId of executionIds) this.executionService.stopExecution(executionId);
		await this.chatExecutionService.cancelSessionWork(agentId, threadId, executionIds);
	}
}
