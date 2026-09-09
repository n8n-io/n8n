import { Logger } from '@n8n/backend-common';
import { SchedulerConfig, WorkflowsConfig } from '@n8n/config';
import type { PollerFailureState, PollerFullState } from '@n8n/db';
import { PollerStateRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import { isDurablePollerChainEnabled } from '@/scheduling/poll-trigger-node/durable-poller-chain';
import {
	computeBackoffDelayMs,
	pollFailureFromError,
	RETRY_AFTER_MAX_MS,
} from '@/workflows/triggers/poll-backoff-policy';

@Service()
export class PollBackoffService {
	constructor(
		private readonly pollerStateRepository: PollerStateRepository,
		private readonly schedulerConfig: SchedulerConfig,
		private readonly workflowsConfig: WorkflowsConfig,
		private logger: Logger,
		private readonly errorReporter: ErrorReporter,
	) {
		this.logger = this.logger.scoped('poll-trigger');
	}

	/**
	 * Same gate as PollCursorService: backoff rides on durable cursors, which
	 * ride on the durable poller chain. Turning this off freezes any stored
	 * state instead of clearing it.
	 */
	get enabled(): boolean {
		return (
			this.schedulerConfig.durableCursorsEnabled &&
			isDurablePollerChainEnabled(this.schedulerConfig, this.workflowsConfig)
		);
	}

	/**
	 * Reads the stored poller state: the cursor plus the failure counters.
	 *
	 * Never throws: `null` means no stored state, feature disabled, or a failed read.
	 */
	async getState(workflowId: string, nodeId: string): Promise<PollerFullState | null> {
		if (!this.enabled) return null;

		try {
			return await this.pollerStateRepository.findState(workflowId, nodeId);
		} catch (error) {
			this.reportFailure(error, workflowId, nodeId, 'Failed to read poller state');
			return null;
		}
	}

	/**
	 * Whether `state` still holds a future backoff deadline.
	 *
	 * A deadline beyond `RETRY_AFTER_MAX_MS` or otherwise malformed counts as no
	 * backoff, so a bad value can never stall a poll indefinitely.
	 */
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

		// May trail the stored count by one when polls overlap; harmless.
		const consecutiveErrors = (state?.consecutiveErrors ?? 0) + 1;

		try {
			const { type, retryAfterMs, cause } = pollFailureFromError(error, now);
			const delayMs = computeBackoffDelayMs({ type, consecutiveErrors, retryAfterMs });

			const updated = await this.pollerStateRepository.recordFailure(workflowId, nodeId, delayMs);

			if (!updated) {
				this.logger.debug('Poller state row missing while recording a poll failure', {
					workflowId,
					nodeId,
				});
			} else {
				this.logger.warn('Poll failed; backing off', {
					workflowId,
					nodeId,
					type,
					cause,
					consecutiveErrors,
					delayMs,
				});
			}
		} catch (writeError) {
			this.reportFailure(writeError, workflowId, nodeId, 'Failed to record poll failure');
		}
	}

	/**
	 * Forgets the failures of a poll that returned.
	 *
	 * A pre-poll state known to be clean skips the round trip. The write itself is
	 * guarded on the stored row, so a state read that has since gone stale cannot
	 * clear a row it never saw failing.
	 */
	async recordSuccess(args: {
		workflowId: string;
		nodeId: string;
		state: PollerFailureState | null;
	}): Promise<void> {
		const { workflowId, nodeId, state } = args;
		// `null` may also mean the read failed, so only a known-clean state skips the write.
		if (state === null || state.consecutiveErrors > 0 || state.backoffUntil !== null) {
			await this.reset(workflowId, nodeId);
		}
	}

	/** Forgets past failures, so a new node does not start inside an old backoff window. */
	async reset(workflowId: string, nodeId: string): Promise<void> {
		if (!this.enabled) return;

		try {
			await this.pollerStateRepository.clearFailures(workflowId, nodeId);
		} catch (error) {
			this.reportFailure(error, workflowId, nodeId, 'Failed to clear poller failure state');
		}
	}

	/** Never throws: it already runs from a catch block. */
	private reportFailure(error: unknown, workflowId: string, nodeId: string, message: string): void {
		try {
			this.logger.error(message, { workflowId, nodeId, error });
		} catch {
			// Reporting a failure must not cause another.
		}

		try {
			this.errorReporter.error(error, { extra: { workflowId, nodeId } });
		} catch {
			// Guarded separately so one failing does not skip the other.
		}
	}
}
