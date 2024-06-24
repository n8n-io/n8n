import { Logger } from '@/Logger';
import config from '@/config';
import { Service } from 'typedi';
import { ConcurrencyQueue } from './concurrency-queue';
import { UnknownExecutionModeError } from '@/errors/unknown-execution-mode.error';
import { InvalidConcurrencyLimitError } from '@/errors/invalid-concurrency-limit.error';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { WorkflowExecuteMode as ExecutionMode } from 'n8n-workflow';
import type { IExecutingWorkflowData } from '@/Interfaces';
import { Telemetry } from '@/telemetry';

export const CLOUD_TEMP_PRODUCTION_LIMIT = 999;
export const CLOUD_TEMP_REPORTABLE_THRESHOLDS = [5, 10, 20, 50, 100, 200];

@Service()
export class ConcurrencyControlService {
	private readonly isEnabled: boolean;

	private readonly productionLimit: number;

	private readonly productionQueue: ConcurrencyQueue;

	private readonly limitsToReport = CLOUD_TEMP_REPORTABLE_THRESHOLDS.map(
		(t) => CLOUD_TEMP_PRODUCTION_LIMIT - t,
	);

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly telemetry: Telemetry,
	) {
		this.productionLimit = config.getEnv('executions.concurrency.productionLimit');

		if (this.productionLimit === 0) {
			throw new InvalidConcurrencyLimitError(this.productionLimit);
		}

		if (this.productionLimit < -1) {
			this.productionLimit = -1;
		}

		if (this.productionLimit === -1 || config.getEnv('executions.mode') === 'queue') {
			this.isEnabled = false;
			this.log('Service disabled');
			return;
		}

		this.productionQueue = new ConcurrencyQueue(this.productionLimit);

		this.logInit();

		this.isEnabled = true;

		this.productionQueue.on('concurrency-check', ({ capacity }: { capacity: number }) => {
			if (this.shouldReport(capacity)) {
				void this.telemetry.track('User hit concurrency limit', {
					threshold: CLOUD_TEMP_PRODUCTION_LIMIT - capacity,
				});
			}
		});

		this.productionQueue.on('execution-throttled', ({ executionId }: { executionId: string }) => {
			this.log('Execution throttled', { executionId });
		});

		this.productionQueue.on('execution-released', async (executionId: string) => {
			this.log('Execution released', { executionId });
			await this.executionRepository.resetStartedAt(executionId);
		});
	}

	/**
	 * Block or let through an execution based on concurrency capacity.
	 */
	async throttle({ mode, executionId }: { mode: ExecutionMode; executionId: string }) {
		if (!this.isEnabled || this.isUnlimited(mode)) return;

		await this.productionQueue.enqueue(executionId);
	}

	/**
	 * Release capacity back so the next execution in the production queue can proceed.
	 */
	release({ mode }: { mode: ExecutionMode }) {
		if (!this.isEnabled || this.isUnlimited(mode)) return;

		this.productionQueue.dequeue();
	}

	/**
	 * Remove an execution from the production queue, releasing capacity back.
	 */
	remove({ mode, executionId }: { mode: ExecutionMode; executionId: string }) {
		if (!this.isEnabled || this.isUnlimited(mode)) return;

		this.productionQueue.remove(executionId);
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

		const executionIds = Object.entries(activeExecutions)
			.filter(([_, execution]) => execution.status === 'new' && execution.responsePromise)
			.map(([executionId, _]) => executionId);

		if (executionIds.length === 0) return;

		await this.executionRepository.cancelMany(executionIds);

		this.logger.info('Canceled enqueued executions with response promises', { executionIds });
	}

	// ----------------------------------
	//             private
	// ----------------------------------

	private logInit() {
		this.log('Enabled');

		this.log(
			[
				'Production execution concurrency is',
				this.productionLimit === -1 ? 'unlimited' : 'limited to ' + this.productionLimit.toString(),
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

		throw new UnknownExecutionModeError(mode);
	}

	private log(message: string, meta?: object) {
		this.logger.debug(['[Concurrency Control]', message].join(' '), meta);
	}

	private shouldReport(capacity: number) {
		return config.getEnv('deployment.type') === 'cloud' && this.limitsToReport.includes(capacity);
	}
}
