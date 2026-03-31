import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError, type IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { ExecutionAlreadyResumingError } from '@/errors/execution-already-resuming.error';
import { EventService } from '@/events/event.service';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowRunner } from '@/workflow-runner';
import {
	shouldRestartParentExecution,
	updateParentExecutionWithChildResults,
} from './workflow-helpers';

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
		private readonly activeExecutions: ActiveExecutions,
		private readonly workflowRunner: WorkflowRunner,
		private readonly instanceSettings: InstanceSettings,
		private readonly eventService: EventService,
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

		const lastNodeName = fullExecutionData.data.resultData.lastNodeExecuted ?? '';
		const resumedNode = fullExecutionData.workflowData.nodes.find((n) => n.name === lastNodeName);

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

		this.eventService.emit('execution-resumed', {
			executionId,
			workflowId,
			workflowName: fullExecutionData.workflowData.name,
			nodeName: lastNodeName,
			nodeId: resumedNode?.id,
			nodeType: resumedNode?.type,
			resumeSource: 'timer',
			responseAt: new Date(),
		});

		const { parentExecution } = fullExecutionData.data;
		if (shouldRestartParentExecution(parentExecution)) {
			// on child execution completion, resume parent execution
			void this.activeExecutions
				.getPostExecutePromise(executionId)
				.then(async (subworkflowResults) => {
					if (!subworkflowResults) return;
					if (subworkflowResults.status === 'waiting') return; // The child execution is waiting, not completing.
					await updateParentExecutionWithChildResults(
						this.executionRepository,
						parentExecution.executionId,
						subworkflowResults,
					);
					return subworkflowResults;
				})
				.then((subworkflowResults) => {
					if (!subworkflowResults) return;
					if (subworkflowResults.status === 'waiting') return; // The child execution is waiting, not completing.
					void this.startExecution(parentExecution.executionId);
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
