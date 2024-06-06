import { Logger } from '@/Logger';
import config from '@/config';
import { Service } from 'typedi';
import { ConcurrencyQueue } from './concurrency-queue';
import { UnknownExecutionModeError } from '@/errors/unknown-execution-mode.error';
import { InvalidConcurrencyCapError } from '@/errors/invalid-concurrency-cap.error';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import { License } from '@/License';
import type { WorkflowExecuteMode as ExecutionMode } from 'n8n-workflow';

@Service()
export class ConcurrencyControlService {
	private readonly isEnabled: boolean;

	private readonly productionLimit: number;

	private readonly productionQueue: ConcurrencyQueue;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly license: License,
	) {
		this.productionLimit = this.getProductionLimit();

		if (this.productionLimit === 0) {
			throw new InvalidConcurrencyCapError(this.productionLimit);
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

		this.productionQueue.on('execution-throttled', async (executionId: string) => {
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
	async check({ mode, executionId }: { mode: ExecutionMode; executionId: string }) {
		if (!this.isEnabled || this.isUncapped(mode)) return;

		await this.productionQueue.enqueue(executionId);
	}

	/**
	 * Release capacity back so the next execution in the production queue can proceed.
	 */
	release({ mode }: { mode: ExecutionMode }) {
		if (!this.isEnabled || this.isUncapped(mode)) return;

		this.productionQueue.dequeue();
	}

	/**
	 * Remove an execution from the production queue, releasing capacity back.
	 */
	remove({ mode, executionId }: { mode: ExecutionMode; executionId: string }) {
		if (!this.isEnabled || this.isUncapped(mode)) return;

		this.productionQueue.remove(executionId);
	}

	/**
	 * Remove many executions from the production queue, releasing capacity back.
	 */
	removeMany(executionIds: string[]) {
		if (!this.isEnabled) return;

		const enqueuedProductionIds = this.productionQueue.getAll();

		const productionIds = executionIds.filter((id) => enqueuedProductionIds.has(id));

		for (const id of productionIds) {
			this.productionQueue.remove(id);
		}
	}

	/**
	 * Remove all executions from both queues, releasing all capacity back.
	 */
	removeAll() {
		if (!this.isEnabled) return;

		const enqueuedProductionIds = this.productionQueue.getAll();

		for (const id of enqueuedProductionIds) {
			this.productionQueue.remove(id);
		}
	}

	// ----------------------------------
	//             private
	// ----------------------------------

	private getProductionLimit() {
		const envLimit = config.getEnv('executions.concurrency.productionLimit');

		if (config.getEnv('deployment.type') === 'cloud') {
			if (process.env.N8N_CLOUD_OVERRIDE_CONCURRENCY_PRODUCTION_LIMIT === 'true') return envLimit;

			return this.license.getConcurrencyProductionLimit();
		}

		return envLimit;
	}

	private logInit() {
		this.log('Enabled');

		this.log(
			[
				'Production execution concurrency is',
				this.productionLimit === -1 ? 'unlimited' : 'limited to ' + this.productionLimit.toString(),
			].join(' '),
		);
	}

	private isUncapped(mode: ExecutionMode) {
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
		this.logger.info(['[Concurrency Control]', message].join(' '), meta);
	}
}
