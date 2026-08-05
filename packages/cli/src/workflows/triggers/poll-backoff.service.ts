import { Logger } from '@n8n/backend-common';
import { PollerConfig } from '@n8n/config';
import type { PollerFailureState } from '@n8n/db';
import { PollerStateRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';

import {
	classifyPollFailure,
	computeBackoffUntil,
	MAX_BACKOFF_MS,
	retryAfterMs,
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

	get enabled(): boolean {
		return this.pollerConfig.durableCursorsEnabled;
	}

	async peek(workflowId: string, nodeId: string): Promise<PollerFailureState | null> {
		if (!this.enabled) return null;

		try {
			return await this.pollerStateRepository.findFailureState(workflowId, nodeId);
		} catch (error) {
			this.errorReporter.error(error, { extra: { workflowId, nodeId } });
			this.logger.error('Failed to read poller failure state', { workflowId, nodeId, error });
			return null;
		}
	}

	isBackingOff(state: PollerFailureState | null, now: Date): boolean {
		if (state === null || state.backoffUntil === null) return false;

		const untilMs = state.backoffUntil.getTime();
		const nowMs = now.getTime();

		if (untilMs <= nowMs) return false;
		if (untilMs - nowMs > MAX_BACKOFF_MS) return false;

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

		const consecutiveErrors = (state?.consecutiveErrors ?? 0) + 1;
		const failureClass = classifyPollFailure(error);
		const backoffUntil = computeBackoffUntil({
			failureClass,
			consecutiveErrors,
			retryAfterMs: retryAfterMs(error, now),
			now,
		});

		try {
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
			}

			this.logger.warn('Poll failed; backing off', {
				workflowId,
				nodeId,
				failureClass,
				consecutiveErrors,
				backoffUntil,
			});
		} catch (writeError) {
			this.errorReporter.error(writeError, { extra: { workflowId, nodeId } });
			this.logger.error('Failed to record poll failure', { workflowId, nodeId, error: writeError });
		}
	}

	async recordSuccess(args: {
		workflowId: string;
		nodeId: string;
		state: PollerFailureState | null;
	}): Promise<void> {
		const { workflowId, nodeId, state } = args;
		if (!this.enabled) return;
		if (state === null) return;
		if (state.consecutiveErrors === 0 && state.backoffUntil === null) return;

		try {
			await this.pollerStateRepository.clearFailures(workflowId, nodeId);
		} catch (error) {
			this.errorReporter.error(error, { extra: { workflowId, nodeId } });
			this.logger.error('Failed to clear poller failure state', { workflowId, nodeId, error });
		}
	}
}
