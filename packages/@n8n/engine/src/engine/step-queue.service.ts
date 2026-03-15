import type { DataSource } from '@n8n/typeorm';
import { Brackets } from '@n8n/typeorm';

import { StepStatus, ExecutionStatus } from '../database/enums';
import { WorkflowStepExecution } from '../database/entities/workflow-step-execution.entity';
import { WorkflowExecution } from '../database/entities/workflow-execution.entity';
import type { StepProcessorService } from './step-processor.service';
import type { MetricsService } from './metrics.service';

/** Minimum polling interval (ms) — used immediately after wake() or finding work. */
const MIN_POLL_INTERVAL = 10;
/** Maximum polling interval (ms) — cap for exponential backoff on empty polls. */
const MAX_POLL_INTERVAL = 1000;

/**
 * Polls the database for queued step executions and dispatches them
 * to the StepProcessorService. Uses SELECT FOR UPDATE SKIP LOCKED
 * for safe concurrent claiming.
 *
 * Adaptive polling: starts at MIN_POLL_INTERVAL after wake(), doubles
 * the interval on each empty poll (up to MAX_POLL_INTERVAL), and resets
 * to MIN_POLL_INTERVAL when work is found.
 */
export class StepQueueService {
	private inFlight = 0;
	private pollTimer: ReturnType<typeof setTimeout> | null = null;
	private currentInterval: number = MIN_POLL_INTERVAL;

	constructor(
		private readonly dataSource: DataSource,
		private readonly stepProcessor: StepProcessorService,
		private readonly maxConcurrency: number = 10,
		private readonly metrics?: MetricsService,
	) {}

	start(): void {
		this.currentInterval = MIN_POLL_INTERVAL;
		this.schedulePoll();
	}

	stop(): void {
		if (this.pollTimer) {
			clearTimeout(this.pollTimer);
			this.pollTimer = null;
		}
	}

	/**
	 * Wake the poller: reset to minimum interval so new work is picked up
	 * almost immediately. Call this when new steps are queued (from
	 * StepPlanner or EngineService).
	 */
	wake(): void {
		this.currentInterval = MIN_POLL_INTERVAL;
		// If currently waiting with a long timeout, cancel and reschedule
		if (this.pollTimer) {
			clearTimeout(this.pollTimer);
			this.schedulePoll();
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

		if (claimed.length === 0) {
			// Empty poll: exponential backoff (double interval, capped)
			this.currentInterval = Math.min(this.currentInterval * 2, MAX_POLL_INTERVAL);
			return;
		}

		// Work found: reset to minimum interval
		this.currentInterval = MIN_POLL_INTERVAL;

		// Track claim latency for each claimed step
		for (const step of claimed) {
			const latency = Date.now() - new Date(step.createdAt).getTime();
			this.metrics?.stepQueueClaimLatency.observe(latency);
		}

		// Track queue depth and DB-derived status metrics piggybacked on the poll cycle
		if (this.metrics) {
			const depth = await this.dataSource
				.getRepository(WorkflowStepExecution)
				.createQueryBuilder('wse')
				.where('wse.status = :status', { status: StepStatus.Queued })
				.getCount();
			this.metrics.stepQueueDepth.set(depth);

			// Collect execution counts by status
			const execCounts = await this.dataSource
				.getRepository(WorkflowExecution)
				.createQueryBuilder('we')
				.select('we.status', 'status')
				.addSelect('COUNT(*)', 'count')
				.groupBy('we.status')
				.getRawMany();

			for (const { status, count } of execCounts) {
				this.metrics.executionsByStatus.set({ status }, parseInt(count, 10));
			}

			// Derive active executions from DB instead of inc/dec across instances
			const runningCount = execCounts.find((c: { status: string }) => c.status === 'running');
			this.metrics.executionActive.set(runningCount ? parseInt(runningCount.count, 10) : 0);

			// Collect step execution counts by status
			const stepCounts = await this.dataSource
				.getRepository(WorkflowStepExecution)
				.createQueryBuilder('wse')
				.select('wse.status', 'status')
				.addSelect('COUNT(*)', 'count')
				.groupBy('wse.status')
				.getRawMany();

			for (const { status, count } of stepCounts) {
				this.metrics.stepExecutionsByStatus.set({ status }, parseInt(count, 10));
			}
		}

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
			.andWhere(`"startedAt" <= NOW() - :thresholdMs * INTERVAL '1 millisecond'`, {
				thresholdMs: defaultStaleThresholdMs,
			})
			.execute();
	}

	/**
	 * Stop accepting new work and wait for in-flight steps to finish.
	 * Returns when all in-flight steps are done or timeout is reached.
	 */
	async drain(timeoutMs: number = 30_000): Promise<void> {
		this.stop();

		const deadline = Date.now() + timeoutMs;
		while (this.inFlight > 0 && Date.now() < deadline) {
			await new Promise((resolve) => setTimeout(resolve, 100));
		}

		if (this.inFlight > 0) {
			console.warn(`StepQueueService drain timeout: ${this.inFlight} steps still in-flight`);
		}
	}

	getInFlightCount(): number {
		return this.inFlight;
	}

	isRunning(): boolean {
		return this.pollTimer !== null;
	}

	/** Exposed for testing: the current adaptive polling interval. */
	getCurrentInterval(): number {
		return this.currentInterval;
	}

	private schedulePoll(): void {
		this.pollTimer = setTimeout(() => {
			this.poll()
				.catch((err) => {
					// Log polling errors but don't crash -- next poll will retry
					console.error('StepQueueService poll error:', err);
				})
				.finally(() => {
					// Schedule the next poll (if still running)
					if (this.pollTimer !== null) {
						this.schedulePoll();
					}
				});
		}, this.currentInterval);
	}
}
