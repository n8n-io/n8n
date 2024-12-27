import { Logger } from 'n8n-core';
import type { WorkflowExecuteMode as ExecutionMode } from 'n8n-workflow';
import { Service } from 'typedi';

import config from '@/config';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { InvalidConcurrencyLimitError } from '@/errors/invalid-concurrency-limit.error';
import { UnknownExecutionModeError } from '@/errors/unknown-execution-mode.error';
import { EventService } from '@/events/event.service';
import type { IExecutingWorkflowData } from '@/interfaces';
import { Telemetry } from '@/telemetry';

import { ConcurrencyQueue } from './concurrency-queue';

export const CLOUD_TEMP_PRODUCTION_LIMIT = 999;
export const CLOUD_TEMP_REPORTABLE_THRESHOLDS = [5, 10, 20, 50, 100, 200];

@Service()
export class ConcurrencyControlService {
	private isEnabled: boolean;

	// private readonly limits: Map<ExecutionMode, number>;

	private readonly productionLimit: number;

	private readonly evaluationLimit: number;

	// private readonly queues: Map<ExecutionMode, ConcurrencyQueue>;

	private readonly productionQueue: ConcurrencyQueue;

	private readonly evaluationQueue: ConcurrencyQueue;

	private readonly limitsToReport = CLOUD_TEMP_REPORTABLE_THRESHOLDS.map(
		(t) => CLOUD_TEMP_PRODUCTION_LIMIT - t,
	);

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly telemetry: Telemetry,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('concurrency');

		this.productionLimit = config.getEnv('executions.concurrency.productionLimit');

		this.evaluationLimit = config.getEnv('executions.concurrency.evaluationLimit');

		if (this.productionLimit === 0) {
			throw new InvalidConcurrencyLimitError(this.productionLimit);
		}

		if (this.evaluationLimit === 0) {
			throw new InvalidConcurrencyLimitError(this.evaluationLimit);
		}

		if (this.productionLimit < -1) {
			this.productionLimit = -1;
		}

		if (this.evaluationLimit < -1) {
			this.evaluationLimit = -1;
		}

		if (this.productionLimit === -1 || config.getEnv('executions.mode') === 'queue') {
			this.isEnabled = false;
			return;
		}

		this.productionQueue = new ConcurrencyQueue(this.productionLimit);

		this.evaluationQueue = new ConcurrencyQueue(this.evaluationLimit);

		this.logInit();

		this.isEnabled = true;

		this.productionQueue.on('concurrency-check', ({ capacity }) => {
			if (this.shouldReport(capacity)) {
				this.telemetry.track('User hit concurrency limit', {
					threshold: CLOUD_TEMP_PRODUCTION_LIMIT - capacity,
				});
			}
		});

		this.productionQueue.on('execution-throttled', ({ executionId }) => {
			this.logger.debug('Execution throttled', { executionId });
			this.eventService.emit('execution-throttled', { executionId });
		});

		this.productionQueue.on('execution-released', async (executionId) => {
			this.logger.debug('Execution released', { executionId });
		});

		this.evaluationQueue.on('execution-throttled', ({ executionId }) => {
			this.logger.debug('Evaluation execution throttled', { executionId });
			this.eventService.emit('execution-throttled', { executionId });
		});

		this.evaluationQueue.on('execution-released', async (executionId) => {
			this.logger.debug('Evaluation execution released', { executionId });
		});
	}

	/**
	 * Check whether an execution is in the production queue.
	 */
	has(executionId: string) {
		if (!this.isEnabled) return false;

		return (
			this.productionQueue.getAll().has(executionId) ||
			this.evaluationQueue.getAll().has(executionId)
		);
	}

	/**
	 * Block or let through an execution based on concurrency capacity.
	 */
	async throttle({ mode, executionId }: { mode: ExecutionMode; executionId: string }) {
		if (!this.isEnabled || this.isUnlimited(mode)) return;

		if (mode === 'evaluation') {
			await this.evaluationQueue.enqueue(executionId);
		} else {
			await this.productionQueue.enqueue(executionId);
		}
	}

	/**
	 * Release capacity back so the next execution in the production queue can proceed.
	 */
	release({ mode }: { mode: ExecutionMode }) {
		if (!this.isEnabled || this.isUnlimited(mode)) return;

		if (mode === 'evaluation') {
			this.evaluationQueue.dequeue();
		} else {
			this.productionQueue.dequeue();
		}
	}

	/**
	 * Remove an execution from the production queue, releasing capacity back.
	 */
	remove({ mode, executionId }: { mode: ExecutionMode; executionId: string }) {
		if (!this.isEnabled || this.isUnlimited(mode)) return;

		if (mode === 'evaluation') {
			this.evaluationQueue.remove(executionId);
		} else {
			this.productionQueue.remove(executionId);
		}
	}

	/**
	 * Empty the production queue, releasing all capacity back. Also cancel any
	 * enqueued executions that have response promises, as these cannot
	 * be re-run via `Start.runEnqueuedExecutions` during startup.
	 */
	async removeAll(activeExecutions: { [executionId: string]: IExecutingWorkflowData }) {
		if (!this.isEnabled) return;

		const enqueuedProductionIds = this.productionQueue.getAll();

		for (const id of enqueuedProductionIds) {
			this.productionQueue.remove(id);
		}

		const enqueuedEvaluationIds = this.evaluationQueue.getAll();

		for (const id of enqueuedEvaluationIds) {
			this.evaluationQueue.remove(id);
		}

		const executionIds = Object.entries(activeExecutions)
			.filter(([_, execution]) => execution.status === 'new' && execution.responsePromise)
			.map(([executionId, _]) => executionId);

		if (executionIds.length === 0) return;

		await this.executionRepository.cancelMany(executionIds);

		this.logger.info('Canceled enqueued executions with response promises', { executionIds });
	}

	disable() {
		this.isEnabled = false;
	}

	// ----------------------------------
	//             private
	// ----------------------------------

	private logInit() {
		this.logger.debug('Enabled');

		this.logger.debug(
			[
				'Production execution concurrency is',
				this.productionLimit === -1 ? 'unlimited' : 'limited to ' + this.productionLimit.toString(),
			].join(' '),
		);

		this.logger.debug(
			[
				'Evaluation execution concurrency is',
				this.productionLimit === -1 ? 'unlimited' : 'limited to ' + this.evaluationLimit.toString(),
			].join(' '),
		);
	}

	private isUnlimited(mode: ExecutionMode) {
		if (
			mode === 'error' ||
			mode === 'integrated' ||
			mode === 'cli' ||
			mode === 'internal' ||
			mode === 'manual' ||
			mode === 'retry'
		) {
			return true;
		}

		if (mode === 'webhook' || mode === 'trigger') return this.productionLimit === -1;

		if (mode === 'evaluation') return this.evaluationLimit === -1;

		throw new UnknownExecutionModeError(mode);
	}

	private shouldReport(capacity: number) {
		return config.getEnv('deployment.type') === 'cloud' && this.limitsToReport.includes(capacity);
	}

	// private getQueue(mode: ExecutionMode) {
	// 	if (['production', 'evaluation'].includes(mode)) {
	// 		return this.queues.get(mode);
	// 	}
	//
	// 	throw new UnknownExecutionModeError(mode);
	// }
}
