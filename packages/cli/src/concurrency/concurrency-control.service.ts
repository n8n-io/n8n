import { Service } from '@n8n/di';
import { capitalize } from 'lodash';
import { Logger } from 'n8n-core';
import type { WorkflowExecuteMode as ExecutionMode } from 'n8n-workflow';

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

export type ConcurrencyQueueType = 'production' | 'evaluation';

@Service()
export class ConcurrencyControlService {
	private isEnabled: boolean;

	private readonly limits: Map<ConcurrencyQueueType, number>;

	private readonly queues: Map<ConcurrencyQueueType, ConcurrencyQueue>;

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

		this.limits = new Map([
			['production', config.getEnv('executions.concurrency.productionLimit')],
			['evaluation', config.getEnv('executions.concurrency.evaluationLimit')],
		]);

		this.limits.forEach((limit, type) => {
			if (limit === 0) {
				throw new InvalidConcurrencyLimitError(limit);
			}

			if (limit < -1) {
				this.limits.set(type, -1);
			}
		});

		if (
			Array.from(this.limits.values()).every((limit) => limit === -1) ||
			config.getEnv('executions.mode') === 'queue'
		) {
			this.isEnabled = false;
			return;
		}

		this.queues = new Map();
		this.limits.forEach((limit, type) => {
			if (limit > 0) {
				this.queues.set(type, new ConcurrencyQueue(limit));
			}
		});

		this.logInit();

		this.isEnabled = true;

		this.queues.forEach((queue, type) => {
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
	async throttle({ mode, executionId }: { mode: ExecutionMode; executionId: string }) {
		if (!this.isEnabled || this.isUnlimited(mode)) return;

		await this.getQueue(mode)?.enqueue(executionId);
	}

	/**
	 * Release capacity back so the next execution in the queue can proceed.
	 */
	release({ mode }: { mode: ExecutionMode }) {
		if (!this.isEnabled || this.isUnlimited(mode)) return;

		this.getQueue(mode)?.dequeue();
	}

	/**
	 * Remove an execution from the production queue, releasing capacity back.
	 */
	remove({ mode, executionId }: { mode: ExecutionMode; executionId: string }) {
		if (!this.isEnabled || this.isUnlimited(mode)) return;

		this.getQueue(mode)?.remove(executionId);
	}

	/**
	 * Empty the production queue, releasing all capacity back. Also cancel any
	 * enqueued executions that have response promises, as these cannot
	 * be re-run via `Start.runEnqueuedExecutions` during startup.
	 */
	async removeAll(activeExecutions: { [executionId: string]: IExecutingWorkflowData }) {
		if (!this.isEnabled) return;

		this.queues.forEach((queue) => {
			const enqueuedExecutionIds = queue.getAll();

			for (const id of enqueuedExecutionIds) {
				queue.remove(id);
			}
		});

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

		this.limits.forEach((limit, type) => {
			this.logger.debug(
				[
					`${capitalize(type)} execution concurrency is`,
					limit === -1 ? 'unlimited' : 'limited to ' + limit.toString(),
				].join(' '),
			);
		});
	}

	private isUnlimited(mode: ExecutionMode) {
		return this.getQueue(mode) === undefined;
	}

	private shouldReport(capacity: number) {
		return config.getEnv('deployment.type') === 'cloud' && this.limitsToReport.includes(capacity);
	}

	/**
	 * Get the concurrency queue based on the execution mode.
	 */
	private getQueue(mode: ExecutionMode) {
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

		if (mode === 'webhook' || mode === 'trigger') return this.queues.get('production');

		if (mode === 'evaluation') return this.queues.get('evaluation');

		throw new UnknownExecutionModeError(mode);
	}
}
