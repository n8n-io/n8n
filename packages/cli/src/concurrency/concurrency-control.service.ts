import { Logger } from '@/Logger';
import config from '@/config';
import { Service } from 'typedi';
import { ConcurrencyQueue } from './concurrency-queue';
import { UnknownExecutionModeError } from '@/errors/unknown-execution-mode.error';
import { UnsupportedConcurrencyCapError } from '@/errors/unsupported-concurrency-cap.error';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { WorkflowExecuteMode as ExecutionMode } from 'n8n-workflow';

@Service()
export class ConcurrencyControlService {
	private readonly productionCap = config.getEnv('executions.concurrency.productionCap');

	readonly productionQueue: ConcurrencyQueue;

	readonly isEnabled: boolean;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
	) {
		if (this.productionCap === -1 || config.getEnv('executions.mode') === 'queue') {
			this.isEnabled = false;
			this.log('Service disabled');
			return;
		}

		if (this.productionCap === 0 || this.productionCap <= -2) {
			throw new UnsupportedConcurrencyCapError(this.productionCap);
		}

		this.productionQueue = new ConcurrencyQueue(this.productionCap);

		this.logInit();

		this.isEnabled = true;

		this.productionQueue.on('execution-released', async (event: { executionId: string }) => {
			await this.executionRepository.resetStartedAt(event.executionId);
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

	private logInit() {
		this.log('Enabled');

		this.log(
			[
				'Production execution concurrency is',
				this.productionCap === -1 ? 'uncapped' : 'capped to ' + this.productionCap.toString(),
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

		if (mode === 'webhook' || mode === 'trigger') return this.productionCap === -1;

		throw new UnknownExecutionModeError(mode);
	}

	private log(message: string, meta?: object) {
		this.logger.info(['[Concurrency Control]', message].join(' '), meta);
	}
}
