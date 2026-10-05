import { EventService } from '@n8n/backend-services';
import { Service } from '@n8n/di';

import { CredentialConnectionStatusService } from './credential-connection-status.service';

@Service()
export class CredentialConnectionStatusCleanupListener {
	constructor(
		private readonly eventService: EventService,
		private readonly connectionStatusService: CredentialConnectionStatusService,
	) {}

	init() {
		this.eventService.on(
			'credential-connection-status-cleanup-requested',
			({ userIds, entityManager, complete }) => {
				void this.connectionStatusService
					.cleanupOrphanedEntriesForUsers(userIds, entityManager)
					.then(() => complete())
					.catch((error: unknown) => complete(error));
			},
		);
	}
}
