import { Logger } from '@/Logger';
import config from '@/config';
import { Service } from 'typedi';
import { ConcurrencyQueue } from './concurrency-queue';
import { type WorkflowExecuteMode as ExecutionMode } from 'n8n-workflow';
import { UnknownExecutionModeError } from '@/errors/unknown-execution-mode.error';
import { UnexpectedExecutionModeError } from '@/errors/unexpected-execution-mode.error';
import { ConcurrencyCapZeroError } from '@/errors/concurrency-cap-zero.error';
import { Push } from '@/push';

@Service()
export class ConcurrencyControlService {
	private readonly manualCap = config.getEnv('executions.concurrency.manualCap');

	private readonly productionCap = config.getEnv('executions.concurrency.productionCap');

	private readonly manualQueue: ConcurrencyQueue;

	private readonly productionQueue: ConcurrencyQueue;

	private readonly isEnabled: boolean;

	constructor(
		private readonly logger: Logger,
		private readonly push: Push,
	) {
		if (this.manualCap === 0 || this.productionCap === 0) {
			throw new ConcurrencyCapZeroError();
		}

		if (this.manualCap === -1 && this.productionCap === -1) {
			this.isEnabled = false;
			this.logger.info('[Concurrency Control] Disabled');
			return;
		}

		this.productionQueue = new ConcurrencyQueue(
			{
				kind: 'production',
				capacity: this.productionCap,
			},
			this.logger,
			this.push,
		);

		this.manualQueue = new ConcurrencyQueue(
			{
				kind: 'manual',
				capacity: this.manualCap,
			},
			this.logger,
			this.push,
		);

		this.logInit();

		this.isEnabled = true;
	}

	/**
	 * Block or let through an execution based on concurrency capacity.
	 */
	async check({ mode, executionId }: { mode: ExecutionMode; executionId: string }) {
		if (!this.isEnabled || this.isUncapped(mode)) return;

		await this.getQueue(mode).enqueue(executionId);
	}

	/**
	 * Release capacity back so the next queued execution can proceed, if the resulting capacity allows.
	 */
	release({ mode }: { mode: ExecutionMode }) {
		if (!this.isEnabled) return;

		this.getQueue(mode).dequeue();
	}

	/**
	 * Remove an execution from a concurrency control queue, releasing capacity back.
	 */
	remove({ mode, executionId }: { mode: ExecutionMode; executionId: string }) {
		if (!this.isEnabled) return;

		const wasRemoved = this.getQueue(mode).remove(executionId);

		if (wasRemoved) this.getQueue(mode).dequeue();
	}

	/**
	 * Remove multiple executions from concurrency control queues, releasing capacity back.
	 */
	removeMany(executionIds: string[]) {
		if (!this.isEnabled) return;

		const queuedManualIds = this.manualQueue.getAll();
		const queuedProductionIds = this.productionQueue.getAll();

		const manualIds = executionIds.filter((id) => queuedManualIds.has(id));
		const productionIds = executionIds.filter((id) => queuedProductionIds.has(id));

		for (const id of manualIds) {
			this.manualQueue.remove(id);
		}

		for (const id of productionIds) {
			this.productionQueue.remove(id);
		}
	}

	private logInit() {
		this.logger.info('[Concurrency Control] Enabled');

		this.logger.info(
			[
				'[Concurrency Control] Manual execution concurrency is',
				this.manualCap === -1 ? 'uncapped' : this.manualCap.toString(),
			].join(' '),
		);

		this.logger.info(
			[
				'[Concurrency Control] Production execution concurrency is',
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
}
