import { Logger } from '@n8n/backend-common';
import type { IExecutionResponse } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { ErrorReporter } from 'n8n-core';
import { ensureError, type IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { EventService } from '@/events/event.service';
import { ResumeAttemptService } from '@/executions/resume-attempt.service';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowRunner } from '@/workflow-runner';

/**
 * Starts the executions that a shutdown left in the `new` (enqueued) status. Each one is
 * loaded on its own and counted as a resume attempt first, so one execution whose data does
 * not fit in memory cannot keep the process from starting.
 */
@Service()
export class EnqueuedExecutionRecoveryService {
	constructor(
		private readonly logger: Logger,
		private readonly errorReporter: ErrorReporter,
		private readonly executionRepository: ExecutionRepository,
		private readonly resumeAttemptService: ResumeAttemptService,
		private readonly ownershipService: OwnershipService,
		private readonly workflowRunner: WorkflowRunner,
		private readonly eventService: EventService,
	) {}

	async recoverEnqueuedExecutions() {
		const executionIds = await this.executionRepository.findEnqueuedIds();

		if (executionIds.length === 0) return;

		this.logger.debug('Found enqueued executions to run', { executionIds });

		for (const executionId of executionIds) {
			try {
				await this.recoverEnqueuedExecution(executionId);
			} catch (error) {
				if (error instanceof ExecutionAlreadyResumingError) {
					this.logger.debug('Execution was already claimed, skipping recovery', { executionId });
					continue;
				}
				this.errorReporter.error(error, { executionId, shouldBeLogged: false });
				this.logger.error('Failed to run enqueued execution', { executionId, error });
			}
		}
	}

	private async recoverEnqueuedExecution(executionId: string) {
		const claim = await this.resumeAttemptService.claim(executionId, 'new');
		if (!claim.granted) return;

		const execution = await this.loadEnqueuedExecution(executionId, claim.attempt);
		if (!execution) return;

		const project = await this.ownershipService.getWorkflowProjectCached(execution.workflowId);

		const data: IWorkflowExecutionDataProcess = {
			executionMode: execution.mode,
			executionData: execution.data,
			workflowData: execution.workflowData,
			projectId: project.id,
		};

		this.eventService.emit('execution-started-during-bootup', { executionId });

		// do not block - each execution either runs concurrently or is queued
		void this.workflowRunner.run(data, undefined, false, executionId);
	}

	/**
	 * Returns `undefined` when the execution cannot start now. A read error gives the attempt
	 * back and leaves the row `new` for the next start.
	 */
	private async loadEnqueuedExecution(
		executionId: string,
		attempt: number,
	): Promise<IExecutionResponse | undefined> {
		try {
			return await this.executionRepository.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});
		} catch (error) {
			await this.resumeAttemptService.release(executionId, 'new', attempt);
			this.errorReporter.error(error, { executionId, shouldBeLogged: false });
			this.logger.warn('Failed to load enqueued execution, leaving it for the next start', {
				executionId,
				error: ensureError(error).message,
			});
			return undefined;
		}
	}
}
