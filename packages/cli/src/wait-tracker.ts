import { Logger } from '@n8n/backend-common';
import { ExecutionRepository } from '@n8n/db';
import { OnLeaderStepdown, OnLeaderTakeover } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { UnexpectedError, type IWorkflowExecutionDataProcess } from 'n8n-workflow';

import { ActiveExecutions } from '@/active-executions';
import { OwnershipService } from '@/services/ownership.service';
import { WorkflowRunner } from '@/workflow-runner';
import { getDataLastExecutedNodeData, shouldRestartParentExecution } from './workflow-helpers';

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
		console.log('=== WaitTracker.startExecution called ===');
		console.log('executionId:', executionId);
		this.logger.debug(`Resuming execution ${executionId}`, { executionId });
		delete this.waitingExecutions[executionId];

		// Get the data to execute
		const fullExecutionData = await this.executionRepository.findSingleExecution(executionId, {
			includeData: true,
			unflattenData: true,
		});
		console.log('Execution status:', fullExecutionData?.status);
		console.log('Has parentExecution:', !!fullExecutionData?.data?.parentExecution);

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
			void this.activeExecutions
				.getPostExecutePromise(executionId)
				.then(async (subworkflowResults) => {
					if (!subworkflowResults) return;

					const lastExecutedNodeData = getDataLastExecutedNodeData(subworkflowResults);
					if (!lastExecutedNodeData?.data) return;

					console.log('--- WaitTracker: Child completed, updating parent');
					console.log('Child final output:', JSON.stringify(lastExecutedNodeData.data, null, 2));

					try {
						const parent = await this.executionRepository.findSingleExecution(
							parentExecution.executionId,
							{
								includeData: true,
								unflattenData: true,
							},
						);

						if (!parent || parent.status !== 'waiting') return;

						const parentWithSubWorkflowResults = {
							data: { ...parent.data },
						};

						if (
							!parentWithSubWorkflowResults.data.executionData?.nodeExecutionStack ||
							parentWithSubWorkflowResults.data.executionData.nodeExecutionStack.length === 0
						) {
							return;
						}

						console.log(
							'Parent nodeExecutionStack[0].data BEFORE update:',
							JSON.stringify(
								parentWithSubWorkflowResults.data.executionData.nodeExecutionStack[0].data,
								null,
								2,
							),
						);

						// Copy the sub workflow result to the parent execution's Execute Workflow node inputs
						// so that the Execute Workflow node returns the correct data when parent execution is resumed
						// and the Execute Workflow node is executed again in disabled mode.
						parentWithSubWorkflowResults.data.executionData.nodeExecutionStack[0].data =
							lastExecutedNodeData.data;

						console.log(
							'Parent nodeExecutionStack[0].data AFTER update:',
							JSON.stringify(
								parentWithSubWorkflowResults.data.executionData.nodeExecutionStack[0].data,
								null,
								2,
							),
						);

						await this.executionRepository.updateExistingExecution(
							parentExecution.executionId,
							parentWithSubWorkflowResults,
						);

						console.log('--- WaitTracker: Parent execution updated in DB');
					} catch (error: unknown) {
						this.logger.error('Could not copy sub workflow result to waiting parent execution', {
							executionId,
							parentExecutionId: parentExecution.executionId,
							workflowId,
							error,
						});
					}
				})
				.then(() => {
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
