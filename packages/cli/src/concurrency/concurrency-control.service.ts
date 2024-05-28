import { Logger } from '@/Logger';
import config from '@/config';
import { Service } from 'typedi';
import { ConcurrencyQueue } from './concurrency-queue';
import { UnknownExecutionModeError } from '@/errors/unknown-execution-mode.error';
import { UnexpectedExecutionModeError } from '@/errors/unexpected-execution-mode.error';
import { ConcurrencyCapZeroError } from '@/errors/concurrency-cap-zero.error';
import { Push } from '@/push';
import { ExecutionRepository } from '@/databases/repositories/execution.repository';
import type { Ids } from './concurrency.types';
import type { WorkflowExecuteMode as ExecutionMode } from 'n8n-workflow';

@Service()
export class ConcurrencyControlService {
	private readonly manualCap = config.getEnv('executions.concurrency.manualCap');

	private readonly productionCap = config.getEnv('executions.concurrency.productionCap');

	readonly manualQueue: ConcurrencyQueue;

	readonly productionQueue: ConcurrencyQueue;

	readonly isEnabled: boolean;

	constructor(
		private readonly logger: Logger,
		private readonly push: Push,
		private readonly executionRepository: ExecutionRepository,
	) {
		if (this.manualCap === 0 || this.productionCap === 0) {
			throw new ConcurrencyCapZeroError();
		}

		if (this.manualCap < 0 && this.productionCap < 0) {
			this.isEnabled = false;
			this.log('Service disabled');
			return;
		}

		this.productionQueue = new ConcurrencyQueue(this.productionCap);
		this.manualQueue = new ConcurrencyQueue(this.manualCap);

		this.logInit();

		this.isEnabled = true;

		this.manualQueue.on('execution-throttled', async (event: Ids) => {
			this.log('Throttled execution', event);
			this.push.broadcast('executionThrottled', event);
		});

		this.manualQueue.on('execution-released', async (event: Ids) => {
			this.log('Released execution', event);
			this.push.broadcast('executionReleased', event);
			await this.executionRepository.resetStartedAt(event.executionId);
		});
	}

	/**
	 * Block or let through an execution based on concurrency capacity.
	 */
	async check({ mode, ...ids }: Ids & { mode: ExecutionMode }) {
		if (!this.isEnabled || this.isUncapped(mode)) return;

		await this.getQueue(mode).enqueue(ids);
	}

	/**
	 * Release capacity back so the next execution in the queue can proceed, if
	 * concurrency capacity allows.
	 */
	release({ mode }: { mode: ExecutionMode }) {
		if (!this.isEnabled) return;

		this.getQueue(mode).dequeue();
	}

	/**
	 * Remove an execution from a queue, releasing capacity back.
	 */
	remove({ mode, executionId }: { mode: ExecutionMode; executionId: string }) {
		if (!this.isEnabled) return;

		this.getQueue(mode).remove(executionId);
	}

	/**
	 * Remove many executions from any of the queues, releasing capacity back.
	 */
	removeMany(executionIds: string[]) {
		if (!this.isEnabled) return;

		const enqueuedManualIds = this.manualQueue.getAll();
		const enqueuedProductionIds = this.productionQueue.getAll();

		const manualIds = executionIds.filter((id) => enqueuedManualIds.has(id));
		const productionIds = executionIds.filter((id) => enqueuedProductionIds.has(id));

		for (const id of manualIds) {
			this.manualQueue.remove(id);
		}

		for (const id of productionIds) {
			this.productionQueue.remove(id);
		}
	}

	/**
	 * Remove all executions from both queues, releasing all capacity back.
	 */
	removeAll() {
		if (!this.isEnabled) return;

		const enqueuedManualIds = this.manualQueue.getAll();
		const enqueuedProductionIds = this.productionQueue.getAll();

		for (const id of enqueuedManualIds) {
			this.manualQueue.remove(id);
		}

		for (const id of enqueuedProductionIds) {
			this.productionQueue.remove(id);
		}
	}

	private logInit() {
		this.log('Enabled');

		this.log(
			[
				'Manual execution concurrency is',
				this.manualCap === -1 ? 'uncapped' : this.manualCap.toString(),
			].join(' '),
		);

		this.log(
			[
				'Production execution concurrency is',
				this.productionCap === -1 ? 'uncapped' : this.productionCap.toString(),
			].join(' '),
		);
	}

	private isUncapped(mode: ExecutionMode) {
		if (mode === 'cli' || mode === 'error' || mode === 'integrated' || mode === 'internal') {
			return true;
		}

		if (mode === 'manual' || mode === 'retry') return this.manualCap === -1;

		if (mode === 'webhook' || mode === 'trigger') return this.productionCap === -1;

		throw new UnknownExecutionModeError(mode);
	}

	private getQueue(mode: ExecutionMode) {
		if (mode === 'manual' || mode === 'retry') return this.manualQueue;

		if (mode === 'webhook' || mode === 'trigger') return this.productionQueue;

		throw new UnexpectedExecutionModeError(mode);
	}

	private log(message: string, meta?: object) {
		this.logger.info(['[Concurrency Control]', message].join(' '), meta);
	}
}
