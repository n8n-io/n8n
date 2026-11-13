import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';

import { UserConsentRepository } from '@/modules/oauth-server/database/repositories/oauth-user-consent.repository';

/** Same throttle as the API key "Last used" time. */
const LAST_USED_AT_THROTTLE_MS = 1 * Time.minutes.toMilliseconds;

/**
 * Records when an OAuth client last used a user's grant on the instance MCP
 * server. The connected clients list shows this time as "Last used".
 */
@Service()
export class McpClientUsageService {
	constructor(
		private readonly userConsentRepository: UserConsentRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * Best-effort: never blocks or fails the MCP request. The database update
	 * holds the throttle, so it applies across mains and to a grant that was
	 * revoked and created again.
	 */
	recordUse(userId: string, clientId: string) {
		void this.userConsentRepository
			.recordLastUsed(userId, clientId, new Date(), LAST_USED_AT_THROTTLE_MS)
			.catch((error: unknown) => {
				this.logger.warn('Failed to update lastUsedAt on MCP client grant', {
					userId,
					clientId,
					error,
				});
			});
	}
}
