import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { type PubSub, Publisher } from '@n8n/backend-services';

import { agentChannelRef } from './utils/agent-channel';

type AgentChange = Extract<
	PubSub.Command,
	{
		command:
			| 'agent-config-changed'
			| 'agent-tasks-changed'
			| 'agent-chat-integration-changed'
			| 'agent-chat-subscription-changed';
	}
>;

@Service()
export class AgentChangePublisher {
	constructor(
		private readonly publisher: Publisher,
		private readonly logger: Logger,
	) {}

	/**
	 * Publish to every process. `publishCommand` is a no-op outside queue mode,
	 * so a single main with workers also receives the change.
	 */
	async publish(change: AgentChange): Promise<void> {
		try {
			await this.publisher.publishCommand(change);
		} catch (error) {
			const { payload } = change;
			this.logger.warn(`Failed to publish ${change.command}`, {
				agentId: payload.agentId,
				...('integration' in payload && agentChannelRef(payload.agentId, payload.integration)),
				...('threadId' in payload && { threadId: payload.threadId }),
				...('action' in payload && { action: payload.action }),
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}
