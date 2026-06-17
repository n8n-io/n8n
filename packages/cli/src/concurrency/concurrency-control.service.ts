import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import type { WorkflowExecuteMode } from 'n8n-workflow';

import { InvalidConcurrencyLimitError } from '@/errors/invalid-concurrency-limit.error';
import { UnknownExecutionModeError } from '@/errors/unknown-execution-mode.error';
import { resolveEvaluationConcurrencyLimit } from '@/evaluation.ee/evaluation-concurrency.helper';
import { EventService } from '@/events/event.service';
import { License } from '@/license';
import { Telemetry } from '@/telemetry';

import { ConcurrencyQueue } from './concurrency-queue';

export const CLOUD_TEMP_PRODUCTION_LIMIT = 999;
export const CLOUD_TEMP_REPORTABLE_THRESHOLDS = [5, 10, 20, 50, 100, 200];

export type ConcurrencyQueueType = 'production' | 'evaluation';

export interface CapacityTarget {
	executionId: string;
	mode: WorkflowExecuteMode;
}

@Service()
export class ConcurrencyControlService {
	private isEnabled: boolean;

	private readonly limits: Map<ConcurrencyQueueType, number>;

	private readonly queues: Map<ConcurrencyQueueType, ConcurrencyQueue>;

	private readonly limitsToReport = CLOUD_TEMP_REPORTABLE_THRESHOLDS.map(
		(t) => CLOUD_TEMP_PRODUCTION_LIMIT - t,
	);

	// The eval queue is built eagerly when the env-resolved limit is already
	// known at boot (operator set `N8N_CONCURRENCY_EVALUATION_LIMIT` to a
	// positive value, or explicit `-1` for unlimited). When the env is
	// unset and the cap comes from the license tier, we defer to first use
	// because `License.init()` resolves after the DI graph is built.
	private evalQueueResolved = false;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly telemetry: Telemetry,
		private readonly eventService: EventService,
		private readonly globalConfig: GlobalConfig,
		private readonly license: License,
	) {
		this.logger = this.logger.scoped('concurrency');

		const { productionLimit, evaluationLimit } = this.globalConfig.executions.concurrency;
		const normalisedProduction = this.normaliseLimit(productionLimit);
		const normalisedEvaluation = this.normaliseLimit(evaluationLimit);

		this.limits = new Map<ConcurrencyQueueType, number>([
			['production', normalisedProduction],
			['evaluation', normalisedEvaluation],
		]);

		if (this.globalConfig.executions.mode === 'queue') {
			this.isEnabled = false;
			return;
		}

		this.queues = new Map();
		if (normalisedProduction > 0) {
			const queue = new ConcurrencyQueue(normalisedProduction);
			this.queues.set('production', queue);
			this.wireQueue(queue, 'production');
		}

		// Eager eval queue when the config already carries a positive cap.
		// In that case the operator has explicitly set the env var, so
		// nothing else can lift the value and we don't need the lazy path.
		// Limit -1 (the env-unset default) is deferred — the license tier
		// may raise it to 3/5 once `License.init()` resolves.
		if (normalisedEvaluation > 0) {
			const queue = new ConcurrencyQueue(normalisedEvaluation);
			this.queues.set('evaluation', queue);
			this.wireQueue(queue, 'evaluation');
			this.evalQueueResolved = true;
		}

		this.isEnabled = this.queues.size > 0;

		this.limits.forEach((limit, type) => {
			if (type === 'evaluation' && !this.evalQueueResolved) return;
			this.logger.debug(
				`${type === 'production' ? 'Production' : 'Evaluation'} execution concurrency is ${
					limit === -1 ? 'unlimited' : 'limited to ' + limit.toString()
				}`,
			);
		});
	}

	private normaliseLimit(limit: number): number {
		if (limit === 0) throw new InvalidConcurrencyLimitError(0);
		return limit < -1 ? -1 : limit;
	}

	/**
	 * Resolve the evaluation concurrency cap lazily on first use when the
	 * constructor couldn't determine it from the env config alone. The
	 * resolver follows env override → license-tier default; the license is
	 * not guaranteed active at DI-construction time, so we defer until the
	 * first eval execution hits `throttle`. Idempotent; subsequent calls
	 * are a no-op.
	 */
	private ensureEvalQueueResolved(): void {
		if (this.evalQueueResolved) return;
		this.evalQueueResolved = true;

		if (this.globalConfig.executions.mode === 'queue') return;

		const normalised = this.normaliseLimit(
			resolveEvaluationConcurrencyLimit(this.globalConfig.executions, this.license),
		);
		this.limits.set('evaluation', normalised);

		if (normalised > 0) {
			const queue = new ConcurrencyQueue(normalised);
			this.queues.set('evaluation', queue);
			this.wireQueue(queue, 'evaluation');
			this.logger.debug(`Evaluation execution concurrency is limited to ${normalised}`);
			this.isEnabled = true;
		} else {
			this.logger.debug('Evaluation execution concurrency is unlimited');
		}
	}

	private wireQueue(queue: ConcurrencyQueue, type: ConcurrencyQueueType): void {
		queue.on('concurrency-check', ({ capacity }) => {
			if (this.shouldReport(capacity)) {
				this.telemetry.track('User hit concurrency limit', {
					threshold: CLOUD_TEMP_PRODUCTION_LIMIT - capacity,
					concurrencyQueue: type,
				});
			}
		});

		queue.on('execution-throttled', ({ executionId }) => {
			this.logger.debug('Execution throttled', { executionId, type });
			this.eventService.emit('execution-throttled', { executionId, type });
		});

		queue.on('execution-released', (executionId) => {
			this.logger.debug('Execution released', { executionId, type });
		});
	}

	/**
	 * Check whether an execution is in any of the queues.
	 */
	has(executionId: string) {
		if (!this.isEnabled) return false;

		for (const queue of this.queues.values()) {
			if (queue.has(executionId)) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Block or let through an execution based on concurrency capacity.
	 */
	async throttle({ mode, executionId }: CapacityTarget) {
		if (mode === 'evaluation') this.ensureEvalQueueResolved();
		if (!this.isEnabled || this.isUnlimited(mode)) return;

		await this.getQueue(mode)?.enqueue(executionId);
	}

	/**
	 * Release capacity back so the next execution in the queue can proceed.
	 */
	release({ mode }: { mode: WorkflowExecuteMode }) {
		if (mode === 'evaluation') this.ensureEvalQueueResolved();
		if (!this.isEnabled || this.isUnlimited(mode)) return;

		this.getQueue(mode)?.dequeue();
	}

	/**
	 * Remove an execution from the production queue, releasing capacity back.
	 */
	remove({ mode, executionId }: CapacityTarget) {
		if (mode === 'evaluation') this.ensureEvalQueueResolved();
		if (!this.isEnabled || this.isUnlimited(mode)) return;

		this.getQueue(mode)?.remove(executionId);
	}

	/**
	 * Empty the production queue, releasing all capacity back. Also cancel any
	 * enqueued executions that have response promises, as these cannot
	 * be re-run via `Start.runEnqueuedExecutions` during startup.
	 */
	async removeAll(executionIdsToCancel: string[]) {
		if (!this.isEnabled) return;

		this.queues.forEach((queue) => {
			const enqueuedExecutionIds = queue.getAll();

			for (const id of enqueuedExecutionIds) {
				queue.remove(id);
			}
		});

		if (executionIdsToCancel.length === 0) return;

		await this.executionRepository.cancelMany(executionIdsToCancel);

		this.logger.info('Canceled enqueued executions with response promises', {
			executionIds: executionIdsToCancel,
		});
	}

	disable() {
		this.isEnabled = false;
	}

	// ----------------------------------
	//             private
	// ----------------------------------

	private isUnlimited(mode: WorkflowExecuteMode) {
		return this.getQueue(mode) === undefined;
	}

	private shouldReport(capacity: number) {
		return this.globalConfig.deployment.type === 'cloud' && this.limitsToReport.includes(capacity);
	}

	/**
	 * Get the concurrency queue based on the execution mode.
	 */
	private getQueue(mode: WorkflowExecuteMode) {
		if (
			mode === 'error' ||
			mode === 'integrated' ||
			mode === 'cli' ||
			mode === 'internal' ||
			mode === 'manual' ||
			mode === 'retry'
		) {
			return undefined;
		}

		if (mode === 'webhook' || mode === 'trigger' || mode === 'chat') {
			return this.queues.get('production');
		}

		if (mode === 'evaluation') return this.queues.get('evaluation');

		throw new UnknownExecutionModeError(mode);
	}
}
