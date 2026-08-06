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

	// A kill switch, not a per-row rule: disabling it freezes existing state instead of un-migrating it.
	get enabled(): boolean {
		return this.pollerConfig.durableCursorsEnabled;
	}

	/**
	 * Never throws: `null` covers "no row", "flag off", and "the read
	 * failed" alike, so a bad read can't turn a tick into a retry.
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
	// legitimately ask for an hour off, so clamping at the 30-minute ceiling
	// would discard that. Every path here fails open on a malformed deadline.
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

		// Computed independently of the UPDATE's own increment, so under
		// overlapping failing polls this can differ from the stored count by one; harmless.
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
		// Skips the write only when state is known clean; peek returns null for
		// both "no row" and "a failed read", so treating null as clean here
		// would let a bad read leave a real deadline standing.
		if (state !== null && state.consecutiveErrors === 0 && state.backoffUntil === null) return;

		await this.reset(workflowId, nodeId);
	}

	/** Forgets past failures, so a newly provisioned node is not born inside an old backoff window. */
	async reset(workflowId: string, nodeId: string): Promise<void> {
		if (!this.enabled) return;

		try {
			await this.pollerStateRepository.clearFailures(workflowId, nodeId);
		} catch (error) {
			this.reportFailure(error, workflowId, nodeId, 'Failed to clear poller failure state');
		}
	}

	// Logging and reporting must not throw either, since this already runs from a catch block.
	private reportFailure(error: unknown, workflowId: string, nodeId: string, message: string): void {
		try {
			this.logger.error(message, { workflowId, nodeId, error });
		} catch {
			// The real failure was already handled; reporting it must not add another.
		}

		try {
			this.errorReporter.error(error, { extra: { workflowId, nodeId } });
		} catch {
			// As above, and guarded separately so one failing does not skip the other.
		}
	}
}
