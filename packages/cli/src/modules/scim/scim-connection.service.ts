import type {
	ScimAuthFailure,
	ScimAuthFailureReason,
	ScimConnectionStatus,
	ScimTokenDetails,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { CacheService } from '@n8n/backend-services';
import { Service } from '@n8n/di';

import { ScimTokenRepository, type StoredScimToken } from './database/scim-token.repository';
import { ScimSettingsService } from './scim-settings.service';

/**
 * Minimum time between two writes of the same kind on one main. An identity
 * provider sends many requests in a full sync, and one write each minute is
 * enough for the status on the settings page.
 */
export const SCIM_ACTIVITY_WRITE_INTERVAL_MS = 60 * 1000;

/**
 * Cache key of the time of the last saved failure write on any main. Redis
 * shares it between the mains. A memory cache backend on several mains does
 * not share it, so there each main knows only its own failure writes.
 */
const FAILURE_WRITE_CACHE_KEY = 'scim.connection.lastFailureWriteAt';

const toTime = (iso: string | null | undefined) => (iso ? Date.parse(iso) : -Infinity);

const isRecent = (at: number | undefined, now: number) =>
	at !== undefined && now - at < SCIM_ACTIVITY_WRITE_INTERVAL_MS;

/** A `superseded_token` write that a request claimed on this main. */
type OldTokenFailureWrite = { at: number; running: boolean };

/**
 * The one rule for the SCIM connection status. The settings page shows this
 * value and does not repeat the rule.
 *
 * Without a token, nothing can connect, so the status is `waiting`.
 *
 * Any client can send a request without a valid token. Thus, after the first
 * use of the token, only `superseded_token` causes `error`: it needs a token
 * that this instance issued. Before the first use, every failure causes
 * `error`, so that a wrong setup of the identity provider shows.
 */
export function deriveScimConnectionStatus(
	token: Pick<ScimTokenDetails, 'createdAt' | 'lastUsedAt'> | null,
	lastAuthFailure: ScimAuthFailure | null,
): ScimConnectionStatus {
	if (!token) return 'waiting';

	const failedAt = toTime(lastAuthFailure?.at);
	const isNewFailure = failedAt > toTime(token.lastUsedAt) && failedAt > toTime(token.createdAt);
	const canCauseError = !token.lastUsedAt || lastAuthFailure?.reason === 'superseded_token';
	if (isNewFailure && canCauseError) return 'error';

	return token.lastUsedAt ? 'connected' : 'waiting';
}

/**
 * Records the requests of the identity provider that the status of the SCIM
 * connection comes from: the last request that the token authenticated, and
 * the last request that failed the bearer check.
 *
 * The throttle state is in memory, so each main writes at most once a minute
 * for each kind, and once more after a reset on another main. After a failure
 * write on any main, the next use writes at once. A recording failure is
 * logged and does not fail the request.
 *
 * A failure without a token of this instance does not replace a stored
 * `superseded_token` failure. Only a reset or a newer `superseded_token`
 * failure replaces it. `ScimSettingsService.setLastAuthFailure` applies this
 * rule while it locks the stored failure.
 */
@Service()
export class ScimConnectionService {
	/** Token hash and time of the last `lastUsedAt` write on this main. */
	private lastUseWrite?: { tokenHash: string; at: number };

	/**
	 * The last `superseded_token` write on this main: its time, and if it still
	 * runs. The other failures have a separate throttle, so that requests
	 * without a valid token cannot delay this write.
	 */
	private lastOldTokenFailureWrite?: OldTokenFailureWrite;

	private lastOtherFailureWriteAt?: number;

	constructor(
		private readonly logger: Logger,
		private readonly scimTokenRepository: ScimTokenRepository,
		private readonly scimSettingsService: ScimSettingsService,
		private readonly cacheService: CacheService,
	) {}

	async recordAuthSuccess(token: Pick<StoredScimToken, 'tokenHash'>) {
		const now = Date.now();
		if (!(await this.claimUseWrite(token.tokenHash, now))) return;

		try {
			await this.scimTokenRepository.markUsed(token.tokenHash, new Date(now), {});
		} catch (error) {
			this.logger.warn('SCIM: Failed to record the last use of the token', { error });
		}
	}

	/**
	 * After a failure write the status can be `error`. Then the use is written
	 * at once, so that the status is `connected` again without a delay. A
	 * failure write on another main is known only from the cache, so each
	 * throttled request reads it.
	 */
	private async claimUseWrite(tokenHash: string, now: number): Promise<boolean> {
		const lastWrite = this.lastUseWrite;
		const wroteRecently =
			lastWrite?.tokenHash === tokenHash && now - lastWrite.at < SCIM_ACTIVITY_WRITE_INTERVAL_MS;

		if (wroteRecently) {
			const failedSinceUse =
				this.lastLocalFailureWriteAt() > lastWrite.at ||
				(await this.readSharedFailureWriteAt()) > lastWrite.at;
			if (!failedSinceUse) return false;
			// A parallel request wrote the use during the read.
			if (this.lastUseWrite !== lastWrite) return false;
		}

		// Update the state before the write, so that concurrent requests skip it.
		this.lastUseWrite = { tokenHash, at: now };
		return true;
	}

	/** The failure throttles keep the times of the failure writes on this main. */
	private lastLocalFailureWriteAt() {
		return Math.max(
			this.lastOldTokenFailureWrite?.at ?? -Infinity,
			this.lastOtherFailureWriteAt ?? -Infinity,
		);
	}

	/**
	 * Time of the last saved failure write on any main, from the cache. A
	 * failed read counts as no failure. It is logged at debug level only,
	 * because each throttled request reads the value.
	 */
	private async readSharedFailureWriteAt(): Promise<number> {
		try {
			const at = await this.cacheService.get<unknown>(FAILURE_WRITE_CACHE_KEY);
			return typeof at === 'number' ? at : -Infinity;
		} catch (error) {
			this.logger.debug('SCIM: Failed to read the time of the last failure write', { error });
			return -Infinity;
		}
	}

	async recordAuthFailure(reason: ScimAuthFailureReason) {
		const now = Date.now();
		if (reason !== 'superseded_token') {
			if (this.claimOtherFailureWrite(now)) await this.writeFailure(reason, now);
			return;
		}

		const write = await this.claimOldTokenFailureWrite(now);
		if (!write) return;
		try {
			await this.writeFailure(reason, now);
		} finally {
			write.running = false;
		}
	}

	private async writeFailure(reason: ScimAuthFailureReason, now: number) {
		let stored = false;
		try {
			stored = await this.scimSettingsService.setLastAuthFailure({
				at: new Date(now).toISOString(),
				reason,
			});
		} catch (error) {
			this.logger.warn('SCIM: Failed to record the authentication failure', { error });
		}

		// Only after the commit, so that no main acts on a failure that is not saved.
		if (stored) await this.shareFailureWrite(now);
	}

	/**
	 * Stores the time of a saved failure write for the other mains. A
	 * throttled main compares it with a use write from the last interval, so
	 * the cache keeps it for one interval.
	 */
	private async shareFailureWrite(at: number) {
		try {
			await this.cacheService.set(FAILURE_WRITE_CACHE_KEY, at, SCIM_ACTIVITY_WRITE_INTERVAL_MS);
		} catch (error) {
			this.logger.warn('SCIM: Failed to share the time of the failure write', { error });
		}
	}

	/**
	 * Only a token that this instance issued gets `superseded_token`, so this
	 * write replaces any stored failure. It reads the database only inside
	 * the throttle.
	 *
	 * A reset on another main, for example a token rotation, clears the
	 * stored failure but not the throttle of this main. Thus, when the stored
	 * failure is not a `superseded_token` failure, write at once.
	 */
	private async claimOldTokenFailureWrite(now: number): Promise<OldTokenFailureWrite | undefined> {
		const lastWrite = this.lastOldTokenFailureWrite;
		if (lastWrite && isRecent(lastWrite.at, now)) {
			// The running write stores this failure. A read sees it only after the commit.
			if (lastWrite.running) return undefined;
			if (await this.storesOldTokenFailure()) return undefined;
			// A parallel request claimed the write during the read.
			if (this.lastOldTokenFailureWrite !== lastWrite) return undefined;
		}

		// A new object, so that a claim in the same millisecond is also a change.
		const write = { at: now, running: true };
		this.lastOldTokenFailureWrite = write;
		return write;
	}

	/**
	 * Any client can cause these failures. The write skips them while a
	 * `superseded_token` failure is stored, so the claim does not read it.
	 */
	private claimOtherFailureWrite(now: number): boolean {
		if (isRecent(this.lastOtherFailureWriteAt, now)) return false;

		this.lastOtherFailureWriteAt = now;
		return true;
	}

	/**
	 * Whether the stored failure is a `superseded_token` failure. A failed
	 * read counts as yes, so that the caller does not write.
	 */
	private async storesOldTokenFailure(): Promise<boolean> {
		try {
			const stored = await this.scimSettingsService.getLastAuthFailure();
			return stored?.reason === 'superseded_token';
		} catch (error) {
			this.logger.warn('SCIM: Failed to read the stored authentication failure', { error });
			return true;
		}
	}

	/**
	 * Remove the stored failure, so that the status starts again from the
	 * requests that follow. Call it when an admin generates, rotates or enables.
	 * A later successful request does not call it: the status rule compares
	 * the times. The reset time stays stored, so that a slow write of an older
	 * failure cannot bring it back.
	 */
	async resetAuthFailure() {
		this.lastOldTokenFailureWrite = undefined;
		this.lastOtherFailureWriteAt = undefined;

		await this.scimSettingsService.clearLastAuthFailure();
		await this.cacheService.delete(FAILURE_WRITE_CACHE_KEY);
	}
}
