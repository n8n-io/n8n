import type { PushPayload } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { Push } from '@/push';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import type { AgentExecutionThread } from './entities/agent-execution-thread.entity';
import { AgentPushRecipientsService } from './agent-push-recipients.service';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { threadBelongsTo } from './utils/agent-thread-access';

type AgentExecutionUpdate = PushPayload<'agentExecutionUpdated'>;

@Service()
export class AgentExecutionUpdateBroadcaster {
	constructor(
		private readonly logger: Logger,
		private readonly recipients: AgentPushRecipientsService,
		private readonly push: Push,
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
		private readonly threadRepository: AgentExecutionThreadRepository,
	) {
		this.logger = this.logger.scoped('agents');
	}

	notify(data: AgentExecutionUpdate): void {
		void this.broadcast(data).catch((error: unknown) => {
			this.logger.warn('Failed to broadcast agent execution update', {
				executionId: data.executionId,
				threadId: data.threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	private async broadcast(data: AgentExecutionUpdate): Promise<void> {
		const thread = await this.threadRepository.findOneBy({ id: data.threadId });
		if (!thread || thread.projectId !== data.projectId || thread.agentId !== data.agentId) return;
		const userIds = await this.getRecipients(thread);
		if (userIds.length === 0) return;

		this.push.sendToUsers({ type: 'agentExecutionUpdated', data }, userIds);

		if (this.instanceSettings.isWorker || this.instanceSettings.isMultiMain) {
			await this.publisher.publishCommand({
				command: 'relay-agent-execution-update',
				payload: { data, userIds },
			});
		}
	}

	notifyBackgroundJobsUpdated(agentId: string, threadId: string): void {
		void this.broadcastBackgroundJobsUpdated(agentId, threadId).catch((error: unknown) => {
			this.logger.warn('Failed to broadcast background job update', { agentId, threadId, error });
		});
	}

	private async broadcastBackgroundJobsUpdated(agentId: string, threadId: string): Promise<void> {
		const thread = await this.threadRepository.findOneBy({ id: threadId });
		if (!thread || thread.agentId !== agentId) return;

		const data = { projectId: thread.projectId, agentId, threadId };
		const userIds = await this.getRecipients(thread);
		if (userIds.length === 0) return;

		this.push.sendToUsers({ type: 'agentBackgroundTasksUpdated', data }, userIds);
		if (this.instanceSettings.isWorker || this.instanceSettings.isMultiMain) {
			await this.publisher.publishCommand({
				command: 'relay-agent-background-tasks-update',
				payload: { data, userIds },
			});
		}
	}

	private async getRecipients(thread: AgentExecutionThread): Promise<string[]> {
		const userIds = await this.recipients.getProjectReaders(thread.projectId);
		return userIds.filter((id) => threadBelongsTo(thread, thread.projectId, thread.agentId, id));
	}

	@OnPubSubEvent('relay-agent-background-tasks-update', { instanceType: 'main' })
	handleBackgroundJobsRelay({
		data,
		userIds,
	}: PubSubCommandMap['relay-agent-background-tasks-update']): void {
		this.push.sendToUsers({ type: 'agentBackgroundTasksUpdated', data }, userIds);
	}

	@OnPubSubEvent('relay-agent-execution-update', { instanceType: 'main' })
	handleRelay({ data, userIds }: PubSubCommandMap['relay-agent-execution-update']): void {
		this.push.sendToUsers({ type: 'agentExecutionUpdated', data }, userIds);
	}
}
