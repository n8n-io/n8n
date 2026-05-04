import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { EventService } from '@/events/event.service';

import { InstanceAiService } from './instance-ai.service';

@Service()
export class InstanceAiEventRelay {
	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly instanceAiService: InstanceAiService,
	) {
		this.logger = this.logger.scoped('instance-ai');

		this.eventService.on('user-deleted', ({ targetUserId }) => {
			if (!targetUserId) return;
			this.handleUserDeleted(targetUserId);
		});
	}

	private handleUserDeleted(userId: string): void {
		try {
			const revoked = this.instanceAiService.revokeGatewaySession(userId);
			if (revoked) {
				this.logger.debug('Revoked local gateway session for deleted user', { userId });
			}
		} catch (error) {
			this.logger.error('Failed to revoke local gateway session for deleted user', {
				userId,
				error,
			});
		}
	}
}
