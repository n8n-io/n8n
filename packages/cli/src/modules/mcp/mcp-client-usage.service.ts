import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';

import { UserConsentRepository } from '@/modules/oauth-server/database/repositories/oauth-user-consent.repository';

/** Same throttle as the API key "Last used" time. */
const LAST_USED_AT_THROTTLE_MS = 1 * Time.minutes.toMilliseconds;

/** Upper bound for the local fast path, so memory stays flat with many active tokens. */
const MAX_TRACKED_TOKENS = 1000;

/** One served MCP request from an OAuth client, with the access token that admitted it. */
export type McpClientUse = {
	userId: string;
	clientId: string;
	/** The token's `jti` claim. */
	tokenId: string;
	/** The bearer itself, so the write applies only while this token is still active. */
	accessToken: string;
};

/**
 * Records when an OAuth client last used a user's grant on the instance MCP
 * server. The connected clients list shows this time as "Last used".
 */
@Service()
export class McpClientUsageService {
	/**
	 * Last time this main sent the update for each access token. A local fast
	 * path only: the database update holds the real throttle. The key includes
	 * the token id, so a grant that was revoked and created again gets a new
	 * key with its new token and its first use is recorded.
	 */
	private readonly lastSent = new Map<string, number>();

	constructor(
		private readonly userConsentRepository: UserConsentRepository,
		private readonly logger: Logger,
	) {}

	/**
	 * Best-effort: never blocks or fails the MCP request. The database update
	 * holds the throttle, so it applies across mains.
	 */
	recordUse({ userId, clientId, tokenId, accessToken }: McpClientUse) {
		const now = Date.now();
		const key = `${userId}:${clientId}:${tokenId}`;

		const previous = this.lastSent.get(key);
		if (previous !== undefined && now - previous < LAST_USED_AT_THROTTLE_MS) return;
		this.remember(key, now);

		void this.userConsentRepository
			.recordLastUsed({
				userId,
				clientId,
				accessToken,
				usedAt: new Date(now),
				minIntervalMs: LAST_USED_AT_THROTTLE_MS,
			})
			.catch((error: unknown) => {
				// Allow a retry on the next request instead of waiting for the throttle.
				// Keep the entry if a later request already replaced it.
				if (this.lastSent.get(key) === now) this.lastSent.delete(key);
				this.logger.warn('Failed to update lastUsedAt on MCP client grant', {
					userId,
					clientId,
					error,
				});
			});
	}

	private remember(key: string, now: number) {
		// Re-insert so the Map order stays least-recently-sent first.
		this.lastSent.delete(key);
		if (this.lastSent.size >= MAX_TRACKED_TOKENS) {
			const oldest = this.lastSent.keys().next();
			if (!oldest.done) this.lastSent.delete(oldest.value);
		}
		this.lastSent.set(key, now);
	}
}
