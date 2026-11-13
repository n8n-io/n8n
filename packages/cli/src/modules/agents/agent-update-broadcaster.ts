import type { PushPayload } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { OnPubSubEvent, type PubSubCommandMap } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { Push } from '@/push';
import { Publisher } from '@n8n/backend-services';

import { AgentClusterService } from './agent-cluster.service';
import { AgentPushRecipientsService } from './agent-push-recipients.service';

type AgentUpdate = PushPayload<'agentUpdated'>;

@Service()
export class AgentUpdateBroadcaster {
	constructor(
		private readonly logger: Logger,
		private readonly recipients: AgentPushRecipientsService,
		private readonly push: Push,
		private readonly publisher: Publisher,
		private readonly cluster: AgentClusterService,
	) {
		this.logger = this.logger.scoped('agents');
	}

	notify(data: AgentUpdate, excludePushRef?: string): void {
		void this.broadcast(data, excludePushRef).catch((error: unknown) => {
			this.logger.warn('Failed to broadcast agent update', {
				agentId: data.agentId,
				error: error instanceof Error ? error.message : String(error),
			});
		});
	}

	private async broadcast(data: AgentUpdate, excludePushRef?: string): Promise<void> {
		const userIds = await this.recipients.getProjectReaders(data.projectId);
		if (userIds.length === 0) return;

		this.push.sendToUsers({ type: 'agentUpdated', data }, userIds, { excludePushRef });

		if (!this.cluster.shouldRelayAcrossProcesses()) return;
		const payload = { data, userIds, excludePushRef };
		if (!this.cluster.fitsInPubSubMessage(payload)) {
			this.logger.warn('Skipped an agent update relay because the payload is too large', {
				agentId: data.agentId,
			});
			return;
		}
		await this.publisher.publishCommand({ command: 'relay-agent-update', payload });
	}

	@OnPubSubEvent('relay-agent-update', { instanceType: 'main' })
	handleRelay({ data, userIds, excludePushRef }: PubSubCommandMap['relay-agent-update']): void {
		this.push.sendToUsers({ type: 'agentUpdated', data }, userIds, { excludePushRef });
	}
}
