import type { DataSource } from '@n8n/typeorm';
import { Brackets } from '@n8n/typeorm';

import { StepStatus, ExecutionStatus } from '../database/enums';
import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import type { StepProcessorService } from './step-processor.service';

/**
 * Polls the database for queued step executions and dispatches them
 * to the StepProcessorService. Uses SELECT FOR UPDATE SKIP LOCKED
 * for safe concurrent claiming.
 */
export class StepQueueService {
	private inFlight = 0;
	private pollTimer: ReturnType<typeof setInterval> | null = null;

	constructor(
		private readonly dataSource: DataSource,
		private readonly stepProcessor: StepProcessorService,
		private readonly maxConcurrency: number = 10,
		private readonly pollIntervalMs: number = 50,
	) {}

	start(): void {
		this.pollTimer = setInterval(() => {
			this.poll().catch((err) => {
				// Log polling errors but don't crash -- next poll will retry
				console.error('StepQueueService poll error:', err);
			});
		}, this.pollIntervalMs);
	}

	stop(): void {
		if (this.pollTimer) {
			clearInterval(this.pollTimer);
			this.pollTimer = null;
		}
	}

	async poll(): Promise<void> {
		const available = this.maxConcurrency - this.inFlight;
		if (available <= 0) return;

		// Transaction 1: Claim steps atomically (short-lived)
		const claimed = await this.dataSource.transaction(async (manager) => {
			const steps = await manager
				.getRepository(WorkflowStepExecution)
				.createQueryBuilder('wse')
				// Join execution to check pause_requested and cancel_requested
				.innerJoin(WorkflowExecution, 'we', 'we.id = wse.executionId')
				.setLock('pessimistic_write', undefined, ['wse'])
				.where(
					new Brackets((qb) => {
						qb.where('wse.status = :queued', { queued: StepStatus.Queued })
							.orWhere('wse.status = :retryPending AND wse.retryAfter <= NOW()', {
								retryPending: StepStatus.RetryPending,
							})
							// Note: parent steps in 'waiting' have waitUntil=NULL.
							// NULL <= NOW() evaluates to NULL (falsy), so parents are
							// correctly excluded. Only child steps with a concrete
							// waitUntil timestamp are picked up.
							.orWhere(
								'wse.status = :waiting AND wse.waitUntil IS NOT NULL AND wse.waitUntil <= NOW()',
								{ waiting: StepStatus.Waiting },
							);
					}),
				)
				// Don't pick up steps from paused, cancelled, or failed executions
				.andWhere('we.pauseRequested = false')
				.andWhere('we.cancelRequested = false')
				.andWhere('we.status NOT IN (:...blocked)', {
					blocked: [
						ExecutionStatus.Failed,
						ExecutionStatus.Cancelled,
						ExecutionStatus.Paused,
						ExecutionStatus.Completed,
					],
				})
				.orderBy('wse.createdAt', 'ASC')
				.limit(available)
				.getMany();

			if (steps.length === 0) return [];

			// Set to 'running' and commit -- releases the lock
			await manager
				.createQueryBuilder()
				.update(WorkflowStepExecution)
				.set({ status: StepStatus.Running, startedAt: () => 'NOW()' })
				.whereInIds(steps.map((s) => s.id))
				.execute();

			return steps;
		});
		// Transaction committed -- lock released -- steps are safe from double-pickup

		if (claimed.length === 0) return;

		// Dispatch concurrently, outside any transaction
		this.inFlight += claimed.length;

		await Promise.allSettled(
			claimed.map(async (step) => {
				try {
					await this.stepProcessor.processStep(step);
				} finally {
					this.inFlight--;
				}
			}),
		);
	}

	/**
	 * Finds steps stuck in 'running' beyond timeout + 30s buffer
	 * and re-queues them by setting status back to 'queued'.
	 * Called periodically to handle crashed workers.
	 */
	async recoverStaleSteps(): Promise<void> {
		// Default timeout is 5 minutes (300_000ms), plus 30s buffer = 330s
		const defaultStaleThresholdMs = 330_000;

		await this.dataSource
			.getRepository(WorkflowStepExecution)
			.createQueryBuilder()
			.update(WorkflowStepExecution)
			.set({ status: StepStatus.Queued })
			.where('status = :status', { status: StepStatus.Running })
			.andWhere(`"startedAt" <= NOW() - INTERVAL '${defaultStaleThresholdMs} milliseconds'`)
			.execute();
	}

	getInFlightCount(): number {
		return this.inFlight;
	}

	isRunning(): boolean {
		return this.pollTimer !== null;
	}
}
