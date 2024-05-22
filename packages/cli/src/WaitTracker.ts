import {
	ApplicationError,
	ErrorReporterProxy as ErrorReporter,
	WorkflowOperationError,
} from 'n8n-workflow';
import { Service } from 'typedi';
import type { ExecutionStopResult, IWorkflowExecutionDataProcess } from '@/Interfaces';
import { WorkflowRunner } from '@/WorkflowRunner';
import { ExecutionRepository } from '@db/repositories/execution.repository';
import { OwnershipService } from '@/services/ownership.service';
import { Logger } from '@/Logger';
import { OrchestrationService } from '@/services/orchestration.service';

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
		private readonly ownershipService: OwnershipService,
		private readonly workflowRunner: WorkflowRunner,
		readonly orchestrationService: OrchestrationService,
	) {
		const { isSingleMainSetup, isLeader, multiMainSetup } = orchestrationService;

		if (isSingleMainSetup) {
			this.startTracking();
			return;
		}

		if (isLeader) this.startTracking();

		multiMainSetup
			.on('leader-takeover', () => this.startTracking())
			.on('leader-stepdown', () => this.stopTracking());
	}

	startTracking() {
		this.logger.debug('Wait tracker started tracking waiting executions');

		// Poll every 60 seconds a list of upcoming executions
		this.mainTimer = setInterval(() => {
			void this.getWaitingExecutions();
		}, 60000);

		void this.getWaitingExecutions();
	}

	async getWaitingExecutions() {
		this.logger.debug('Wait tracker querying database for waiting executions');

		const executions = await this.executionRepository.getWaitingExecutions();

		if (executions.length === 0) {
			return;
		}

		const executionIds = executions.map((execution) => execution.id).join(', ');
		this.logger.debug(
			`Wait tracker found ${executions.length} executions. Setting timer for IDs: ${executionIds}`,
		);

		// Add timers for each waiting execution that they get started at the correct time

		for (const execution of executions) {
			const executionId = execution.id;
			if (this.waitingExecutions[executionId] === undefined) {
				if (!(execution.waitTill instanceof Date)) {
					// n8n expects waitTill to be a date object
					// but for some reason it's not being converted
					// we are handling this like this since it seems to address the issue
					// for some users, as reported by Jon when using a custom image.
					// Once we figure out why this it not a Date object, we can remove this.
					ErrorReporter.error('Wait Till is not a date object', {
						extra: {
							variableType: typeof execution.waitTill,
						},
					});
					if (typeof execution.waitTill === 'string') {
						execution.waitTill = new Date(execution.waitTill);
					}
				}
				const triggerTime = execution.waitTill!.getTime() - new Date().getTime();
				this.waitingExecutions[executionId] = {
					executionId,
					timer: setTimeout(() => {
						this.startExecution(executionId);
					}, triggerTime),
				};
			}
		}
	}

	async stopExecution(executionId: string): Promise<ExecutionStopResult> {
		if (this.waitingExecutions[executionId] !== undefined) {
			// The waiting execution was already scheduled to execute.
			// So stop timer and remove.
			clearTimeout(this.waitingExecutions[executionId].timer);
			delete this.waitingExecutions[executionId];
		}

		// Also check in database
		const fullExecutionData = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});

		if (!fullExecutionData) {
			throw new ApplicationError('Execution not found.', {
				extra: { executionId },
			});
		}

		if (!['new', 'unknown', 'waiting', 'running'].includes(fullExecutionData.status)) {
			throw new WorkflowOperationError(
				`Only running or waiting executions can be stopped and ${executionId} is currently ${fullExecutionData.status}.`,
			);
		}
		// Set in execution in DB as failed and remove waitTill time
		const error = new WorkflowOperationError('Workflow-Execution has been canceled!');

		fullExecutionData.data.resultData.error = {
			...error,
			message: error.message,
			stack: error.stack,
		};

		fullExecutionData.stoppedAt = new Date();
		fullExecutionData.waitTill = null;
		fullExecutionData.status = 'canceled';

		await this.executionRepository.updateExistingExecution(executionId, fullExecutionData);

		return {
			mode: fullExecutionData.mode,
			startedAt: new Date(fullExecutionData.startedAt),
			stoppedAt: fullExecutionData.stoppedAt ? new Date(fullExecutionData.stoppedAt) : undefined,
			finished: fullExecutionData.finished,
			status: fullExecutionData.status,
		};
	}

	startExecution(executionId: string) {
		this.logger.debug(`Wait tracker resuming execution ${executionId}`, { executionId });
		delete this.waitingExecutions[executionId];

		(async () => {
			// Get the data to execute
			const fullExecutionData = await this.executionRepository.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			if (!fullExecutionData) {
				throw new ApplicationError('Execution does not exist.', { extra: { executionId } });
			}
			if (fullExecutionData.finished) {
				throw new ApplicationError('The execution did succeed and can so not be started again.');
			}

			if (!fullExecutionData.workflowData.id) {
				throw new ApplicationError('Only saved workflows can be resumed.');
			}
			const workflowId = fullExecutionData.workflowData.id;
			const project = await this.ownershipService.getWorkflowProjectCached(workflowId);

			const data: IWorkflowExecutionDataProcess = {
				executionMode: fullExecutionData.mode,
				executionData: fullExecutionData.data,
				workflowData: fullExecutionData.workflowData,
				projectId: project.id,
			};

			// Start the execution again
			await this.workflowRunner.run(data, false, false, executionId);
		})().catch((error: Error) => {
			ErrorReporter.error(error);
			this.logger.error(
				`There was a problem starting the waiting execution with id "${executionId}": "${error.message}"`,
				{ executionId },
			);
		});
	}

	stopTracking() {
		this.logger.debug('Wait tracker shutting down');

		clearInterval(this.mainTimer);
		Object.keys(this.waitingExecutions).forEach((executionId) => {
			clearTimeout(this.waitingExecutions[executionId].timer);
		});
	}
}
