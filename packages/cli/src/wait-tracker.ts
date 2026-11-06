import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { ensureError, UnexpectedError, type IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { ResumeAttemptService } from '@/executions/resume-attempt.service';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowRunner } from '@/workflow-runner';
import { shouldRestartParentExecution } from './workflow-helpers';

@Service()
export class WaitTracker {
	private waitingExecutions: {
		[key: string]: {
			executionId: string;
			timer: NodeJS.Timeout;
		};
	} = {};

	mainTimer: NodeJS.Timeout;

	private readonly resuming = new Set<string>();

	constructor(
		private readonly logger: Logger,
		private readonly executionRepository: ExecutionRepository,
		private readonly ownershipService: OwnershipService,
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRunner: WorkflowRunner,
		private readonly instanceSettings: InstanceSettings,
		private readonly resumeAttemptService: ResumeAttemptService,
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
						void this.resumeOrSkip(executionId);
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

	/**
	 * Resume from a timer or a finished child. A claim by another process is expected, so it
	 * is logged and not thrown.
	 */
	async resumeOrSkip(executionId: string) {
		try {
			await this.startExecution(executionId);
		} catch (error) {
			if (error instanceof ExecutionAlreadyResumingError) {
				this.logger.info('Execution already claimed by another process, skipping', {
					executionId,
				});
				return;
			}
			this.logger.error('Failed to start waiting execution', {
				executionId,
				error: ensureError(error).message,
			});
		}
	}

	async startExecution(executionId: string) {
		this.logger.debug(`Resuming execution ${executionId}`, { executionId });
		delete this.waitingExecutions[executionId];

		// A poll can find the row still `waiting` while this process resumes it. A second
		// resume would double the memory in use and consume a second attempt.
		if (this.resuming.has(executionId)) throw new ExecutionAlreadyResumingError(executionId);
		this.resuming.add(executionId);
		try {
			await this.resumeExecution(executionId);
		} finally {
			this.resuming.delete(executionId);
		}
	}

	private async resumeExecution(executionId: string) {
		const claim = await this.resumeAttemptService.claim(executionId, 'waiting');
		if (!claim.granted) return;

		try {
			await this.loadAndRun(executionId);
		} catch (error) {
			// The next poll retries a resume that throws, so it must not count toward the limit
			await this.resumeAttemptService.release(executionId, 'waiting', claim.attempt);
			throw error;
		}
	}

	private async loadAndRun(executionId: string) {
		// Get the data to execute
		const fullExecutionData = await this.executionRepository.findSingleExecution(executionId, {
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
		await this.workflowRunner.run(data, false, false, executionId);

		const { parentExecution } = fullExecutionData.data;
		if (shouldRestartParentExecution(parentExecution)) {
			// on child execution completion, resume parent execution
			void this.activeExecutions.getPostExecutePromise(executionId).then(() => {
				void this.resumeOrSkip(parentExecution.executionId);
			});
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
