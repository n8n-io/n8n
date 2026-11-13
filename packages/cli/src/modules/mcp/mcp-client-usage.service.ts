import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';

import { UserConsentRepository } from '@/modules/oauth-server/database/repositories/oauth-user-consent.repository';

/** Same throttle as the API key "Last used" time. */
const LAST_USED_AT_THROTTLE_MS = 1 * Time.minutes.toMilliseconds;

/** Upper bound for the throttle cache, so a long-running main cannot grow it without limit. */
const MAX_TRACKED_GRANTS = 1000;

/**
 * Records when an OAuth client last used a user's grant on the instance MCP
 * server. The connected clients list shows this time as "Last used".
 */
@Service()
export class McpClientUsageService {
	/** Last write time for each `userId:clientId` grant on this main. */
	private readonly lastWrites = new Map<string, number>();

	constructor(
		private readonly userConsentRepository: UserConsentRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * Best-effort: never blocks or fails the MCP request. Writes at most once a
	 * minute for each grant, because a client sends many requests in a session.
	 */
	recordUse(userId: string, clientId: string) {
		const key = `${userId}:${clientId}`;
		const now = Date.now();
		const previous = this.lastWrites.get(key);
		if (previous !== undefined && now - previous < LAST_USED_AT_THROTTLE_MS) return;

		if (this.lastWrites.size >= MAX_TRACKED_GRANTS) this.lastWrites.clear();
		this.lastWrites.set(key, now);

		void this.userConsentRepository
			.recordLastUsed(userId, clientId, new Date(now))
			.catch((error: unknown) => {
				// Allow a retry on the next request instead of waiting for the throttle.
				this.lastWrites.delete(key);
				this.logger.warn('Failed to update lastUsedAt on MCP client grant', {
					userId,
					clientId,
					error,
				});
			});
	}
}
