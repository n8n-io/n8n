import { Logger } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import { ExecutionsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import { ErrorReporter } from 'n8n-core';
import type { IWorkflowExecutionDataProcess } from 'n8n-workflow';
import { strict as assert } from 'node:assert';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { ExecutionCrashService } from '@/executions/execution-crash.service';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { ExecutionService } from '@/executions/execution.service';
import { ResumeAttemptService } from '@/executions/resume-attempt.service';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowPublisherService } from '@/workflows/workflow-publisher.service';
import { WorkflowRunner } from '@/workflow-runner';

/** How often the recovery checks whether an execution still waiting for admission is still `new`. */
const ADMISSION_CHECK_INTERVAL_MS = 60 * Time.seconds.toMilliseconds;

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
		private readonly executionRepository: ExecutionRepository,
		private readonly executionService: ExecutionService,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly executionCrashService: ExecutionCrashService,
		private readonly resumeAttemptService: ResumeAttemptService,
		private readonly ownershipService: OwnershipService,
		private readonly workflowPublisherService: WorkflowPublisherService,
		private readonly workflowRunner: WorkflowRunner,
		private readonly eventService: EventService,
	) {
		this.logger = this.logger.scoped('enqueued-execution-recovery');
	}

	/**
	 * During startup, we may find executions that had been enqueued at the time of
	 * shutdown. If so, start them one at a time, oldest first: each one is loaded only
	 * once the previous one has been admitted, so the data of executions that still wait
	 * for concurrency capacity does not pile up in memory.
	 *
	 * Regular mode only: in queue mode enqueued executions are picked up by workers,
	 * and dangling ones are handled by `ScalingService.recoverFromQueue`.
	 */
	async recoverEnqueuedExecutions() {
		assert(
			this.executionsConfig.mode === 'regular',
			'Enqueued execution recovery must not run in queue mode',
		);

		const executionIds = await this.executionService.findEnqueuedExecutionIds();

		if (executionIds.length === 0) return;

		this.logger.debug('Found enqueued executions to run', { executionIds });

		for (const executionId of executionIds) {
			try {
				await this.recoverEnqueuedExecution(executionId);
			} catch (error) {
				await this.crashUnstartableExecution(executionId, error);
			}
		}
	}

	private async recoverEnqueuedExecution(executionId: string) {
		// Claimed before the load, so a load that kills the process cannot repeat without limit
		const claim = await this.resumeAttemptService.claim(executionId, 'new');
		if (!claim.granted) return;

		const execution = await this.executionPersistence.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		// An enqueued execution whose data is gone can never run. Left at `new` it sits at
		// "Queued" forever and is re-read on every restart.
		if (!execution) {
			this.logger.warn('Crashing enqueued execution with unreadable data', { executionId });
			await this.executionCrashService.markAsCrashed(executionId, 'start-failure');
			return;
		}

		const project = await this.ownershipService.getWorkflowProjectCached(execution.workflowId);

		const data: IWorkflowExecutionDataProcess = {
			executionMode: execution.mode,
			executionData: execution.data,
			workflowData: execution.workflowData,
			projectId: project.id,
			// Same as a wait resume: the acting user is not stored, so it has to be
			// derived again or the recovered run starts without an identity.
			userId: await this.workflowPublisherService.findActingUserIdForRestart(execution),
		};

		this.eventService.emit('execution-started-during-bootup', { executionId });

		// Resolves once the execution is admitted, not once it finishes
		const admission = this.workflowRunner
			.run(data, undefined, false, {
				executionId,
				expectedStatus: 'new',
				storedAt: execution.storedAt,
			})
			.catch(async (error) => await this.crashUnstartableExecution(executionId, error));

		await this.waitForAdmission(executionId, admission);
	}

	/**
	 * An execution cancelled while it waits for capacity is removed from the queue without
	 * settling its admission. So the wait checks the row at an interval and ends once the row
	 * has left `new`, while a row still queued for capacity keeps the next row from loading.
	 */
	private async waitForAdmission(executionId: string, admission: Promise<unknown>) {
		while (!(await this.settlesWithin(admission, ADMISSION_CHECK_INTERVAL_MS))) {
			if (!(await this.isStillEnqueued(executionId))) return;

			this.logger.debug('Still waiting for the enqueued execution to be admitted', {
				executionId,
			});
		}
	}

	/**
	 * A failed read is only a missed poll. It must not reach the crash path of the loop, which
	 * would crash a healthy execution whose admission is still pending.
	 */
	private async isStillEnqueued(executionId: string) {
		try {
			const [row] = await this.executionRepository.findStatusesByIds([executionId]);
			return row?.status === 'new';
		} catch (error) {
			this.logger.warn('Failed to read the status of an enqueued execution, still waiting', {
				executionId,
				error: ensureError(error).message,
			});
			return true;
		}
	}

	private async settlesWithin(promise: Promise<unknown>, ms: number): Promise<boolean> {
		let timer: NodeJS.Timeout | undefined;
		const timeout = new Promise<false>((resolve) => {
			timer = setTimeout(() => resolve(false), ms);
		});
		try {
			return await Promise.race([promise.then(() => true), timeout]);
		} finally {
			clearTimeout(timer);
		}
	}

	/** An enqueued execution we cannot start would otherwise stay at `new` indefinitely. */
	private async crashUnstartableExecution(executionId: string, error: unknown) {
		if (error instanceof ExecutionAlreadyResumingError) {
			this.logger.debug('Execution was already claimed, skipping recovery', { executionId });
			return;
		}

		// `shouldBeLogged: false` - the log line below carries the same error with more context
		this.errorReporter.error(error, { executionId, shouldBeLogged: false });
		this.logger.error('Failed to run enqueued execution', { executionId, error });

		await this.executionCrashService.markAsCrashed(executionId, 'start-failure');
	}
}
