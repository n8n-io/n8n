import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { ScimTokenService } from './scim-token.service';

/**
 * Deletes the SCIM token of a user whose global role no longer has
 * `scim:manage`.
 *
 * Only a manual role change emits `user-changed-role`. Role mapping and
 * edits to a custom role do not, so `ScimTokenService.verifyApiKey` also
 * checks the scope on each request. This listener only removes a token
 * that can no longer authenticate.
 */
@Service()
export class ScimTokenRevocationListener {
	constructor(
		private readonly logger: Logger,
		private readonly eventService: EventService,
		private readonly userRepository: UserRepository,
		private readonly scimTokenService: ScimTokenService,
	) {
		this.eventService.on('user-changed-role', async ({ targetUserId }) => {
			await this.revokeIfScopeLost(targetUserId);
		});
	}

	async revokeIfScopeLost(userId: string): Promise<void> {
		try {
			const user = await this.userRepository.findByIdWithRole(userId);
			if (!user || this.scimTokenService.canHoldToken(user)) return;

			await this.scimTokenService.deleteAllScimApiKeysForUser(user);
		} catch (error) {
			// The request-time check still rejects the token, so log and go on.
			this.logger.error('SCIM: Failed to delete the token after a role change', {
				userId,
				error,
			});
		}
	}
}
