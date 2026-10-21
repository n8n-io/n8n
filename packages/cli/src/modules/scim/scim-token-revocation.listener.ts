import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { UserRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { ScimTokenService } from './scim-token.service';

/**
 * Deletes the SCIM token of a user whose global role no longer has
 * `scim:manage`.
 *
 * A manual change, SSO role mapping and token exchange each emit their own
 * event. Without the SSO one, a token kept after a demotion works again when
 * the IdP promotes the user back. Edits to a custom role emit no event for
 * each user, so `ScimTokenService.verifyApiKey` also checks the scope on each
 * request. This listener only removes a token that can no longer authenticate.
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
		this.eventService.on('sso-user-instance-role-updated', async ({ userId }) => {
			await this.revokeIfScopeLost(userId);
		});
		this.eventService.on('token-exchange-role-updated', async ({ userId }) => {
			await this.revokeIfScopeLost(userId);
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
