import { INLINE_SUB_AGENT_ID } from '@n8n/agents';
import type { AgentSessionStopResponse } from '@n8n/api-types';
import { ExecutionsConfig } from '@n8n/config';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { NotFoundError } from '@n8n/errors';

import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { AgentExecutionService } from './agent-execution.service';
import { AgentChatExecutionService } from './agent-chat-execution.service';
import { AgentMessageQueueService } from './agent-message-queue.service';
import { AgentQueuedTestStreamService } from './agent-queued-test-stream.service';
import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { SystemAgentRegistry } from './system-agents/system-agent-registry';

@Service()
export class AgentSessionStopService {
	constructor(
		private readonly executionService: AgentExecutionService,
		private readonly messageQueue: AgentMessageQueueService,
		private readonly publisher: Publisher,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly systemAgents: SystemAgentRegistry,
		private readonly chatExecutionService: AgentChatExecutionService,
		private readonly queuedStreams: AgentQueuedTestStreamService,
		private readonly attachments: AgentChatAttachmentService,
		private readonly threads: AgentExecutionThreadRepository,
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

		const { executionIds, queueIds, attachmentIds } =
			await this.messageQueue.prepareSessionStop(threadId);
		if (executionIds.length === 0 && queueIds.length === 0) return { cancelRequested: false };

		const payload = { agentId, threadId, executionIds, queueIds };
		this.onStopSession(payload);
		try {
			if (this.executionsConfig.mode === 'queue') {
				await this.publisher.publishCommand({
					command: 'stop-agent-session',
					payload,
				});
			}
		} finally {
			await Promise.all([
				this.chatExecutionService.cancelSessionWork(agentId, threadId, executionIds),
				this.attachments.deleteByIds(attachmentIds),
			]);
		}
		return { cancelRequested: true };
	}

	/** Internal cleanup includes system and delegated sessions in this project. */
	async stopProjectSessions(projectId: string): Promise<void> {
		for (const thread of await this.threads.findMemoryThreadsForProject(projectId)) {
			try {
				const { executionIds, queueIds } = await this.messageQueue.prepareSessionStop(thread.id, {
					preserveInput: true,
				});
				const payload = {
					agentId: thread.agentId ?? INLINE_SUB_AGENT_ID,
					threadId: thread.id,
					executionIds,
					queueIds,
				};
				this.onStopSession(payload);
				if (this.executionsConfig.mode === 'queue')
					await this.publisher.publishCommand({ command: 'stop-agent-session', payload });
				if (thread.agentId)
					await this.chatExecutionService.cancelProjectSessionWork(thread.agentId, thread.id);
			} catch (error) {
				if (!(error instanceof NotFoundError)) throw error;
			}
		}
	}

	@OnPubSubEvent('stop-agent-session')
	onStopSession({
		agentId,
		threadId,
		executionIds,
		queueIds = [],
	}: PubSubCommandMap['stop-agent-session']): void {
		const localExecutionIds = executionIds.filter((id) => this.executionService.stopExecution(id));
		this.chatExecutionService.stopSessionExecutions(agentId, threadId, localExecutionIds);
		this.queuedStreams.closeQueuedStreams(queueIds);
	}
}
