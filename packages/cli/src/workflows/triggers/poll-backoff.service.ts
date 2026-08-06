import { Logger } from '@n8n/backend-common';
import { PollerConfig } from '@n8n/config';
import type { PollerFailureState } from '@n8n/db';
import { PollerStateRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import {
	classifyPollFailure,
	computeBackoffUntil,
	retryAfterMs,
	RETRY_AFTER_MAX_MS,
} from '@/workflows/triggers/poll-backoff-policy';

@Service()
export class PollBackoffService {
	constructor(
		private readonly pollerStateRepository: PollerStateRepository,
		private readonly pollerConfig: PollerConfig,
		private logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = this.logger.scoped('poll-trigger');
	}

	// A plain flag read, not a per-row rule: disabling it freezes whatever
	// backoff state already exists rather than un-migrating anything, so it
	// stays a clean kill switch and every method below returns before issuing
	// a query.
	get enabled(): boolean {
		return this.pollerConfig.durableCursorsEnabled;
	}

	/**
	 * Advisory: never throws. A DB read failure here must not turn a tick
	 * that would otherwise succeed into one that retries and dead-letters,
	 * so `null` covers "no row", "flag off", and "the read failed" alike.
	 */
	async peek(workflowId: string, nodeId: string): Promise<PollerFailureState | null> {
		if (!this.enabled) return null;

		try {
			return await this.pollerStateRepository.findFailureState(workflowId, nodeId);
		} catch (error) {
			this.reportFailure(error, workflowId, nodeId, 'Failed to read poller failure state');
			return null;
		}
	}

	// Bounded by RETRY_AFTER_MAX_MS, not MAX_BACKOFF_MS: a Retry-After can
	// legitimately push the deadline out to an hour, and clamping at the
	// 30-minute ceiling would discard those, backing a source that asked
	// politely for an hour off less than one that stayed silent. The same
	// bound also covers a stale deadline surviving a flag toggle and gross
	// clock skew. A non-Date or non-finite deadline reads as healthy: every
	// path here fails open.
	isBackingOff(state: PollerFailureState | null, now: Date): boolean {
		if (state === null || !(state.backoffUntil instanceof Date)) return false;

		const untilMs = state.backoffUntil.getTime();
		if (!Number.isFinite(untilMs)) return false;

		const nowMs = now.getTime();

		if (untilMs <= nowMs) return false;
		if (untilMs - nowMs > RETRY_AFTER_MAX_MS) return false;

		return true;
	}

	async recordFailure(args: {
		workflowId: string;
		nodeId: string;
		error: unknown;
		state: PollerFailureState | null;
		now: Date;
	}): Promise<void> {
		const { workflowId, nodeId, error, state, now } = args;
		if (!this.enabled) return;

		// Computed independently of the UPDATE's own increment, so under two
		// overlapping failing polls the value fed to the curve and the value the
		// row ends up holding can differ by one; harmless, since backoff
		// granularity is already coarser than that.
		const consecutiveErrors = (state?.consecutiveErrors ?? 0) + 1;

		try {
			const retryAfter = retryAfterMs(error, now);
			const failureClass = classifyPollFailure(error, retryAfter);
			const backoffUntil = computeBackoffUntil({
				failureClass,
				consecutiveErrors,
				retryAfterMs: retryAfter,
				now,
			});

			const updated = await this.pollerStateRepository.recordFailure(
				workflowId,
				nodeId,
				backoffUntil,
			);

			if (!updated) {
				this.logger.debug('Poller state row missing while recording a poll failure', {
					workflowId,
					nodeId,
				});
			} else {
				this.logger.warn('Poll failed; backing off', {
					workflowId,
					nodeId,
					failureClass,
					consecutiveErrors,
					backoffUntil,
				});
			}
		} catch (writeError) {
			this.reportFailure(writeError, workflowId, nodeId, 'Failed to record poll failure');
		}
	}

	async recordSuccess(args: {
		workflowId: string;
		nodeId: string;
		state: PollerFailureState | null;
	}): Promise<void> {
		const { workflowId, nodeId, state } = args;
		if (!this.enabled) return;
		// Skips the write only when state is known clean; peek returns null for
		// both "no row" and "a failed read", so treating null as clean here
		// would let a bad read leave a real deadline standing.
		if (state !== null && state.consecutiveErrors === 0 && state.backoffUntil === null) return;

		try {
			await this.pollerStateRepository.clearFailures(workflowId, nodeId);
		} catch (error) {
			this.reportFailure(error, workflowId, nodeId, 'Failed to clear poller failure state');
		}
	}

	// Logging and reporting must not throw either, since this runs from catch
	// blocks that already handled the real failure; each guard is independent
	// so one failing doesn't stop the other.
	private reportFailure(error: unknown, workflowId: string, nodeId: string, message: string): void {
		try {
			this.logger.error(message, { workflowId, nodeId, error });
		} catch (loggingError) {
			void loggingError;
		}

		try {
			this.errorReporter.error(error, { extra: { workflowId, nodeId } });
		} catch (reportingError) {
			void reportingError;
		}
	}
}
