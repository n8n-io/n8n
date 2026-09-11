import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { Service } from '@n8n/di';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

import type { AgentChannelStatus } from '../entities/agent-channel-status.entity';
import {
	AgentChannelStatusRepository,
	type AgentChannelRef,
} from '../repositories/agent-channel-status.repository';

/**
 * How long a row counts for, as a multiple of the reconcile interval. Three
 * gives the owner a missed pass and some jitter before anyone concludes it is
 * gone, while still clearing a crashed process within minutes.
 */
const LEASE_INTERVALS = 3;

/**
 * Longest a failing channel waits between retries. Long enough that a channel
 * failing for good stops being noise in the logs, short enough that a user who
 * fixes the cause doesn't wonder whether anything is still trying.
 */
const MAX_BACKOFF_MS = 10 * Time.minutes.toMilliseconds;

/**
 * This process's account of the channels it runs: what it observed, when it
 * should try a failed one again, and how long its account stands.
 *
 * All of it is bookkeeping about reporting, so none of it may fail the operation
 * being reported on — every startup path funnels through `connect`, several of
 * them already swallow their own errors, and reporting must not become a new way
 * for them to break. A write lost here is repaired by the next reconciliation
 * pass.
 */
@Service()
export class AgentChannelStatusReporter {
	/**
	 * Set once this process has withdrawn everything on the way out. Work that
	 * outlives the withdrawal still calls in here — a startup the reconciler
	 * stopped waiting for finishes and reports what it found — and would write a
	 * fresh row for a host that is already gone, leaving the channel reported
	 * against this instance until its lease expires. Nothing this process says
	 * after it has withdrawn still applies, so nothing is written.
	 */
	private hasWithdrawn = false;

	constructor(
		private readonly logger: Logger,
		private readonly agentsConfig: AgentsConfig,
		private readonly repository: AgentChannelStatusRepository,
	) {}

	/** This process has the channel running. */
	async recordConnected(ref: AgentChannelRef): Promise<void> {
		await this.swallow('record a running channel', ref, async () => {
			await this.repository.saveOwn(ref, {
				status: 'connected',
				errorMessage: null,
				attempts: 0,
				backoffUntil: null,
				expiresAt: this.leaseExpiresAt(),
			});
		});
	}

	/**
	 * This process could not start the channel. Counts the attempt and sets the
	 * deadline for the next one — read-then-write is safe because only this
	 * process writes this row.
	 */
	async recordFailure(ref: AgentChannelRef, cause: unknown): Promise<void> {
		await this.swallow('record a failed channel startup', ref, async () => {
			const existing = await this.repository.findOwnChannel(ref);
			const attempts = (existing?.status === 'error' ? existing.attempts : 0) + 1;

			await this.repository.saveOwn(ref, {
				status: 'error',
				// A platform or adapter error can carry the credential it failed with —
				// a failed Telegram request quotes the API URL, and the bot token is in
				// that path. This message is persisted and served to the UI, so it is
				// scrubbed the same way recorded execution errors are.
				errorMessage: scrubSecretsInText(cause instanceof Error ? cause.message : String(cause)),
				attempts,
				backoffUntil: this.backoffUntil(attempts),
				expiresAt: this.leaseExpiresAt(),
			});
		});
	}

	/** Keep standing behind what this process already said. */
	async refreshLease(ref: AgentChannelRef): Promise<void> {
		await this.swallow('refresh a channel status lease', ref, async () => {
			await this.repository.refreshOwnLease(ref, this.leaseExpiresAt());
		});
	}

	/** This process no longer runs the channel, so it has nothing to say about it. */
	async withdraw(ref: AgentChannelRef): Promise<void> {
		await this.swallow('withdraw a channel status', ref, async () => {
			await this.repository.clearOwnChannel(ref);
		});
	}

	/** This process is going away, so nothing it said still applies. */
	async withdrawAll(): Promise<void> {
		// Before the delete, not after: a write landing in between belongs to work
		// that is on its way out with the process, and would outlive the withdrawal.
		this.hasWithdrawn = true;

		try {
			await this.repository.clearOwnHost();
		} catch (error) {
			this.logger.warn(
				`[AgentChannelStatusReporter] Could not withdraw this instance's channel statuses on shutdown: ${this.describe(error)}`,
			);
		}
	}

	/**
	 * Whether a row still counts. A row without an expiry is never stale: nothing
	 * is refreshing it because reconciliation is off, so it is the only account
	 * there is.
	 */
	isLive(row: Pick<AgentChannelStatus, 'expiresAt'>, now: Date): boolean {
		return row.expiresAt === null || row.expiresAt.getTime() > now.getTime();
	}

	/** Whether a failed channel has waited long enough to be tried again. */
	isRetryReady(row: Pick<AgentChannelStatus, 'backoffUntil'> | undefined, now: Date): boolean {
		if (!row?.backoffUntil) return true;
		return row.backoffUntil.getTime() <= now.getTime();
	}

	/**
	 * Null when reconciliation is off: nothing would refresh the lease, so an
	 * expiry would quietly retire every row and leave the API with nothing to
	 * report.
	 */
	private leaseExpiresAt(): Date | null {
		const intervalMs = this.intervalMs();
		if (intervalMs <= 0) return null;

		return new Date(Date.now() + LEASE_INTERVALS * intervalMs);
	}

	/**
	 * Exponential from one interval, capped, so a channel failing on something
	 * that will not fix itself — a deleted credential — stops hammering the
	 * platform and the log.
	 */
	private backoffUntil(attempts: number): Date {
		const intervalMs = this.intervalMs() || Time.minutes.toMilliseconds;
		const delayMs = Math.min(intervalMs * 2 ** Math.max(attempts - 1, 0), MAX_BACKOFF_MS);

		return new Date(Date.now() + delayMs);
	}

	private intervalMs(): number {
		return this.agentsConfig.channelReconcileIntervalSeconds * Time.seconds.toMilliseconds;
	}

	private async swallow(
		what: string,
		ref: AgentChannelRef,
		write: () => Promise<void>,
	): Promise<void> {
		if (this.hasWithdrawn) {
			this.logger.debug(
				`[AgentChannelStatusReporter] Not going to ${what} for ${ref.integrationType} on agent ${ref.agentId} — this instance has withdrawn`,
			);
			return;
		}

		try {
			await write();
		} catch (error) {
			this.logger.warn(
				`[AgentChannelStatusReporter] Could not ${what} for ${ref.integrationType} on agent ${ref.agentId}: ${this.describe(error)}`,
			);
		}
	}

	private describe(error: unknown): string {
		return error instanceof Error ? error.message : String(error);
	}
}
