import { Logger } from '@n8n/backend-common';
import { ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { strict as assert } from 'node:assert';

import { EventService } from '@/events/event.service';
import { ExecutionService } from '@/executions/execution.service';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowRunner } from '@/workflow-runner';

/**
 * Executions enqueued longer ago than this are not replayed on startup. A long outage
 * makes their trigger data stale, so surfacing them as `crashed` - visible and
 * retryable - beats silently running week-old work.
 */
export const MAX_ENQUEUED_EXECUTION_AGE = 7 * Time.days.toMilliseconds;

/**
 * Recovers executions left in the `new` (enqueued) status by a shutdown, so they do
 * not sit at "Queued" forever.
 */
@Service()
export class EnqueuedExecutionRecoveryService {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly executionsConfig: ExecutionsConfig,
		private readonly executionService: ExecutionService,
		private readonly executionRepository: ExecutionRepository,
		private readonly ownershipService: OwnershipService,
		private readonly workflowRunner: WorkflowRunner,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('enqueued-execution-recovery');
	}

	/**
	 * During startup, we may find executions that had been enqueued at the time of
	 * shutdown. If so, start running any such executions concurrently up to the
	 * concurrency limit, and enqueue any remaining ones until we have spare
	 * concurrency capacity again.
	 *
	 * Regular mode only: in queue mode enqueued executions are picked up by workers,
	 * and dangling ones are handled by `ScalingService.recoverFromQueue`.
	 */
	async recoverEnqueuedExecutions() {
		assert(
			this.executionsConfig.mode === 'regular',
			'Enqueued execution recovery must not run in queue mode',
		);

		await this.crashStaleEnqueuedExecutions();

		const executions = await this.executionService.findAllEnqueuedExecutions();

		if (executions.length === 0) return;

		this.logger.debug('Found enqueued executions to run', {
			executionIds: executions.map((e) => e.id),
		});

		for (const execution of executions) {
			// capture the id so the rejection handler below does not retain the whole
			// execution - and with it its run data - while the execution sits queued
			const executionId = execution.id;

			try {
				const project = await this.ownershipService.getWorkflowProjectCached(execution.workflowId);

				const data: IWorkflowExecutionDataProcess = {
					executionMode: execution.mode,
					executionData: execution.data,
					workflowData: execution.workflowData,
					projectId: project.id,
				};

				this.eventService.emit('execution-started-during-bootup', { executionId });

				// do not block - each execution either runs concurrently or is queued
				void this.workflowRunner
					.run(data, undefined, false, { executionId, expectedStatus: 'new' })
					.catch(async (error) => await this.crashUnstartableExecution(executionId, error));
			} catch (error) {
				await this.crashUnstartableExecution(executionId, error);
			}
		}
	}

	/** Sweep before fetching, so we never load the data of an execution we are about to crash. */
	private async crashStaleEnqueuedExecutions() {
		const before = new Date(Date.now() - MAX_ENQUEUED_EXECUTION_AGE);
		const count = await this.executionRepository.markStaleEnqueuedAsCrashed(before);

		if (count > 0) {
			this.logger.warn('Marked stale enqueued executions as crashed', { count, before });
		}
	}

	/** An enqueued execution we cannot start would otherwise stay at `new` indefinitely. */
	private async crashUnstartableExecution(executionId: string, error: unknown) {
		// `shouldBeLogged: false` - the log line below carries the same error with more context
		this.errorReporter.error(error, { executionId, shouldBeLogged: false });
		this.logger.error('Failed to run enqueued execution', { executionId, error });

		await this.executionRepository.markAsCrashed(executionId);
	}
}
