import type { PushPayload } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { ProjectRelationRepository } from '@n8n/db';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { Push } from '@/push';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';

type AgentExecutionUpdate = PushPayload<'agentExecutionUpdated'>;

@Service()
export class AgentExecutionUpdateBroadcaster {
	constructor(
		private readonly logger: Logger,
		private readonly projectRelationRepository: ProjectRelationRepository,
		private readonly push: Push,
		private readonly publisher: Publisher,
		private readonly instanceSettings: InstanceSettings,
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
		const userIds = await this.projectRelationRepository.findUserIdsByProjectId(data.projectId);
		if (userIds.length === 0) return;

		this.push.sendToUsers({ type: 'agentExecutionUpdated', data }, userIds);

		if (this.instanceSettings.isWorker || this.instanceSettings.isMultiMain) {
			await this.publisher.publishCommand({
				command: 'relay-agent-execution-update',
				payload: { data, userIds },
			});
		}
	}

	@OnPubSubEvent('relay-agent-execution-update', { instanceType: 'main' })
	handleRelay({ data, userIds }: PubSubCommandMap['relay-agent-execution-update']): void {
		this.push.sendToUsers({ type: 'agentExecutionUpdated', data }, userIds);
	}
}
