import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { EventService } from '@/events/event.service';

import { ChatHubAgentService } from './chat-hub-agent.service';

@Service()
export class ChatHubEventRelay {
	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly chatHubAgentService: ChatHubAgentService,
	) {
		this.logger = this.logger.scoped('chat-hub');

		this.logger.debug('initializing ChatHub event relay...');

		this.eventService.on('user-deleted', async ({ targetUserId }) => {
			if (!targetUserId) {
				return;
			}
			await this.handleUserDeleted(targetUserId);
		});
	}

	private async handleUserDeleted(userId: string): Promise<void> {
		try {
			await this.chatHubAgentService.deleteAllEmbeddingsForUser(userId);
		} catch (error) {
			this.logger.error('Failed to delete embeddings for deleted user', { userId, error });
		}
	}
}
