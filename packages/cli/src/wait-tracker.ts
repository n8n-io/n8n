import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import {
	ensureError,
	sleep,
	UnexpectedError,
	UserError,
	type IRun,
	type IWorkflowExecutionDataProcess,
	type RelatedExecution,
} from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { ExecutionPersistence } from '@/executions/execution-persistence';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowRunner } from '@/workflow-runner';

import {
	shouldRestartParentExecution,
	updateParentExecutionWithChildResults,
} from './workflow-helpers';

/** How many times each parent-resume step is attempted before giving up. */
const MAX_PARENT_RESUME_ATTEMPTS = 3;

/**
 * Whether a resume parent failure is worth retrying. Only `UserError` and
 * `UnexpectedError` are not. Everything else is retried, including `OperationalError` (which
 * by convention signals a transient issue) and raw database or Redis failures
 */
function isRetryableResumeError(error: unknown): boolean {
	return !(error instanceof UserError || error instanceof UnexpectedError);
}

@Service()
export class WaitTracker {
	private waitingExecutions: {
		[key: string]: {
			executionId: string;
			timer: NodeJS.Timeout;
		};
	} = {};

	mainTimer: NodeJS.Timeout;

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly ownershipService: OwnershipService,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRunner: WorkflowRunner,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.scoped('waiting-executions');
	}

	has(executionId: string) {
		return this.waitingExecutions[executionId] !== undefined;
	}

	init() {
		if (this.instanceSettings.isLeader) this.startTracking();
	}

	@OnLeaderTakeover()
	private startTracking() {
		// Poll every 60 seconds a list of upcoming executions
		this.mainTimer = setInterval(() => {
			void this.getWaitingExecutions();
		}, 60000);

		void this.getWaitingExecutions();

		this.logger.debug('Started tracking waiting executions');
	}

	async getWaitingExecutions() {
		this.logger.debug('Querying database for waiting executions');

		const executions = await this.executionRepository.getWaitingExecutions();

		if (executions.length === 0) {
			return;
		}

		const executionIds = executions.map((execution) => execution.id).join(', ');
		this.logger.debug(
			`Found ${executions.length} executions. Setting timer for IDs: ${executionIds}`,
		);

		// Add timers for each waiting execution that they get started at the correct time

		for (const execution of executions) {
			const executionId = execution.id;
			if (this.waitingExecutions[executionId] === undefined) {
				const triggerTime = execution.waitTill!.getTime() - new Date().getTime();
				this.waitingExecutions[executionId] = {
					executionId,
					timer: setTimeout(() => {
						void this.startExecution(executionId);
					}, triggerTime),
				};
			}
		}
	}

	stopExecution(executionId: string) {
		if (!this.waitingExecutions[executionId]) return;

		clearTimeout(this.waitingExecutions[executionId].timer);

		delete this.waitingExecutions[executionId];
	}

	async startExecution(executionId: string) {
		this.logger.debug(`Resuming execution ${executionId}`, { executionId });
		delete this.waitingExecutions[executionId];

		// Get the data to execute
		const fullExecutionData = await this.executionPersistence.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!fullExecutionData) {
			throw new UnexpectedError('Execution does not exist.', { extra: { executionId } });
		}
		if (fullExecutionData.finished) {
			throw new UnexpectedError('The execution did succeed and can so not be started again.');
		}

		if (!fullExecutionData.workflowData.id) {
			throw new UnexpectedError('Only saved workflows can be resumed.');
		}

		const workflowId = fullExecutionData.workflowData.id;
		const project = await this.ownershipService.getWorkflowProjectCached(workflowId);

		const data: IWorkflowExecutionDataProcess = {
			executionMode: fullExecutionData.mode,
			executionData: fullExecutionData.data,
			workflowData: fullExecutionData.workflowData,
			projectId: project.id,
			pushRef: fullExecutionData.data.pushRef,
			startedAt: fullExecutionData.startedAt,
		};

		// Start the execution again
		try {
			await this.workflowRunner.run(data, false, false, executionId);
		} catch (error) {
			if (error instanceof ExecutionAlreadyResumingError) {
				// This execution is already being resumed by another child execution
				// This is expected in "run once for each item" mode when multiple children complete
				this.logger.debug(
					`Execution ${executionId} is already being resumed, skipping duplicate resume`,
					{ executionId },
				);
				return;
			}
			// Rethrow any other errors
			throw error;
		}

		const { parentExecution } = fullExecutionData.data;
		if (shouldRestartParentExecution(parentExecution)) {
			// on child execution completion, resume parent execution
			void this.resumeParentExecution(
				parentExecution,
				this.activeExecutions.getPostExecutePromise(executionId),
			);
		}
	}

	/**
	 * Resume a parent execution once its child execution has completed.
	 *
	 * The resume crosses several async boundaries (DB write to patch the parent,
	 * then resuming the parent). Each step is retried up to `MAX_PARENT_RESUME_ATTEMPTS`
	 * so a transient failure recovers and the parent resumes.
	 * If every attempt fails, the error is caught and logged below; the parent stays in `waiting`, but the
	 * failure is now visible and attributable instead of lost.
	 * This never rejects, so callers can invoke it as fire and forget.
	 */
	async resumeParentExecution(
		parentExecution: RelatedExecution,
		executePromise: Promise<IRun | undefined>,
	): Promise<void> {
		try {
			const subworkflowResults = await executePromise;
			if (!subworkflowResults) return;
			if (subworkflowResults.status === 'waiting') return; // The child execution is waiting, not completing.

			await this.withRetry(
				async () => {
					await updateParentExecutionWithChildResults(
						parentExecution.executionId,
						subworkflowResults,
					);
				},
				MAX_PARENT_RESUME_ATTEMPTS,
				isRetryableResumeError,
			);

			await this.withRetry(
				async () => {
					await this.startExecution(parentExecution.executionId);
				},
				MAX_PARENT_RESUME_ATTEMPTS,
				isRetryableResumeError,
			);
		} catch (error) {
			this.logger.error('Failed to resume parent execution after sub-workflow completed', {
				parentExecutionId: parentExecution.executionId,
				error: ensureError(error).message,
			});
		}
	}

	/**
	 * Run an operation up to `maxAttempts` times with exponential backoff, returning
	 * on the first success and rethrowing the last error if they all fail. Generic
	 * (not specific to parent resume) — the caller passes the attempt count and an
	 * optional `shouldRetry` predicate; an error it rejects is rethrown immediately
	 * instead of being retried.
	 */
	private async withRetry(
		operation: () => Promise<void>,
		maxAttempts: number,
		shouldRetry: (error: unknown) => boolean = () => true,
	): Promise<void> {
		for (let attempt = 1; ; attempt++) {
			try {
				await operation();
				return;
			} catch (error) {
				if (attempt >= maxAttempts || !shouldRetry(error)) throw error;
				await sleep(100 * 2 ** (attempt - 1));
			}
		}
	}

	@OnLeaderStepdown()
	stopTracking() {
		if (!this.mainTimer) return;

		clearInterval(this.mainTimer);
		Object.keys(this.waitingExecutions).forEach((executionId) => {
			clearTimeout(this.waitingExecutions[executionId].timer);
		});

		this.logger.debug('Stopped tracking waiting executions');
	}
}
