import type {
	ScimAuthFailure,
	ScimAuthFailureReason,
	ScimConnectionStatus,
	ScimTokenDetails,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import type { ScimToken } from './database/scim-token.entity';
import { ScimTokenRepository } from './database/scim-token.repository';
import { ScimSettingsService } from './scim-settings.service';

/**
 * Minimum time between two writes of the same kind on one main. An identity
 * provider sends many requests in a full sync, and one write each minute is
 * enough for the status on the settings page.
 */
export const SCIM_ACTIVITY_WRITE_INTERVAL_MS = 60 * 1000;

const toTime = (iso: string | null | undefined) => (iso ? Date.parse(iso) : -Infinity);

/**
 * The one rule for the SCIM connection status. The settings page shows this
 * value and does not repeat the rule.
 *
 * Without a token, nothing can connect, so the status is `waiting`.
 */
export function deriveScimConnectionStatus(
	token: Pick<ScimTokenDetails, 'createdAt' | 'lastUsedAt'> | null,
	lastAuthFailure: ScimAuthFailure | null,
): ScimConnectionStatus {
	if (!token) return 'waiting';

	const failedAt = toTime(lastAuthFailure?.at);
	if (failedAt > toTime(token.lastUsedAt) && failedAt > toTime(token.createdAt)) return 'error';

	return token.lastUsedAt ? 'connected' : 'waiting';
}

/**
 * Records the requests of the identity provider that the status of the SCIM
 * connection comes from: the last request that the token authenticated, and
 * the last request that failed the bearer check.
 *
 * The throttle state is in memory, so each main writes at most once a minute
 * for each kind. A recording failure is logged and does not fail the request.
 */
@Service()
export class ScimConnectionService {
	/** Token value and time of the last `lastUsedAt` write on this main. */
	private lastUseWrite?: { token: string; at: number };

	private lastFailureWriteAt?: number;

	/** Whether this main wrote a failure after its last `lastUsedAt` write. */
	private failureWrittenSinceUse = false;

	constructor(
		private readonly logger: Logger,
		private readonly scimTokenRepository: ScimTokenRepository,
		private readonly scimSettingsService: ScimSettingsService,
	) {}

	async recordAuthSuccess(token: ScimToken) {
		const now = Date.now();
		const wroteRecently =
			this.lastUseWrite?.token === token.token &&
			now - this.lastUseWrite.at < SCIM_ACTIVITY_WRITE_INTERVAL_MS;

		// After a failure write the status is `error`. Write the use at once, so
		// that the status is `connected` again without a delay.
		if (wroteRecently && !this.failureWrittenSinceUse) return;

		// Update the state before the write, so that concurrent requests skip it.
		this.lastUseWrite = { token: token.token, at: now };
		this.failureWrittenSinceUse = false;

		try {
			await this.scimTokenRepository.markUsed(token.token, new Date(now), {});
		} catch (error) {
			this.logger.warn('SCIM: Failed to record the last use of the token', { error });
		}
	}

	async recordAuthFailure(reason: ScimAuthFailureReason) {
		const now = Date.now();
		if (
			this.lastFailureWriteAt !== undefined &&
			now - this.lastFailureWriteAt < SCIM_ACTIVITY_WRITE_INTERVAL_MS
		) {
			return;
		}

		this.lastFailureWriteAt = now;
		this.failureWrittenSinceUse = true;

		try {
			await this.scimSettingsService.setLastAuthFailure({
				at: new Date(now).toISOString(),
				reason,
			});
		} catch (error) {
			this.logger.warn('SCIM: Failed to record the authentication failure', { error });
		}
	}

	/**
	 * Remove the stored failure, so that the status starts again from the
	 * requests that follow. Call it when an admin generates, rotates or enables.
	 * A later successful request does not call it: the status rule compares
	 * the times.
	 */
	async resetAuthFailure() {
		this.lastFailureWriteAt = undefined;
		this.failureWrittenSinceUse = false;

		await this.scimSettingsService.clearLastAuthFailure();
	}
}
