import { Logger } from '@n8n/backend-common';
import {
	StatisticsNames,
	WorkflowStatisticsRepository,
	ExecutionRepository,
	WorkflowRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type {
	ExecutionStatus,
	INode,
	IRun,
	IWorkflowBase,
	WorkflowExecuteMode,
} from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { UserService } from '@/services/user.service';
import { TypedEmitter } from '@/typed-emitter';

import { OwnershipService } from './ownership.service';
import { getTokensConsumedAndCostIncurred } from './token-usage.utility';
import { UsageService } from './usage.service';

const isStatusRootExecution = {
	success: true,
	crashed: true,
	error: true,

	canceled: false,
	new: false,
	running: false,
	unknown: false,
	waiting: false,
} satisfies Record<ExecutionStatus, boolean>;

const isModeRootExecution = {
	cli: true,
	error: true,
	retry: true,
	trigger: true,
	webhook: true,
	evaluation: true,

	// sub workflows
	integrated: false,

	// error workflows
	internal: false,

	manual: false,
} satisfies Record<WorkflowExecuteMode, boolean>;

type WorkflowStatisticsEvents = {
	nodeFetchedData: { workflowId: string; node: INode };
	workflowExecutionCompleted: {
		workflowData: IWorkflowBase;
		fullRunData: IRun;
		executionId?: string;
		userId?: string;
	};
	'telemetry.onFirstProductionWorkflowSuccess': {
		project_id: string;
		workflow_id: string;
		user_id: string;
	};
	'telemetry.onFirstWorkflowDataLoad': {
		user_id: string;
		project_id: string;
		workflow_id: string;
		node_type: string;
		node_id: string;
	};
};

@Service()
export class WorkflowStatisticsService extends TypedEmitter<WorkflowStatisticsEvents> {
	constructor(
		private readonly logger: Logger,
		private readonly repository: WorkflowStatisticsRepository,
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly ownershipService: OwnershipService,
		private readonly userService: UserService,
		private readonly eventService: EventService,
		private readonly usageService: UsageService,
	) {
		super({ captureRejections: true });
		if ('SKIP_STATISTICS_EVENTS' in process.env) return;

		this.on(
			'nodeFetchedData',
			async ({ workflowId, node }) => await this.nodeFetchedData(workflowId, node),
		);
		this.on(
			'workflowExecutionCompleted',
			async ({ workflowData, fullRunData, executionId, userId }) =>
				await this.workflowExecutionCompleted(workflowData, fullRunData, executionId, userId),
		);
	}

	async workflowExecutionCompleted(
		workflowData: IWorkflowBase,
		runData: IRun,
		executionId?: string,
		userId?: string,
	): Promise<void> {
		if (executionId) {
			const { totalTokens, totalCost } = getTokensConsumedAndCostIncurred(runData);

			// update the token consumed for the execution
			try {
				this.logger.info(
					`execution ${executionId}: ${totalTokens} tokens consumed, ${totalCost} cost incurred`,
				);
				await this.executionRepository.update(
					{ id: executionId },
					{ tokensConsumed: totalTokens, costIncurred: totalCost },
				);
			} catch (error) {
				this.logger.error(`Failed to update tokensConsumed for execution ${executionId}`);
				this.logger.error(`Error: ${error}`);
			}

			// update the total token consumed by this workflow
			try {
				await this.workflowRepository.addTokensConsumedAndCostByWorkflow(
					workflowData.id,
					totalTokens,
					totalCost,
				);
			} catch (error) {
				this.logger.error(`Failed to update tokensConsumed for workflow ${workflowData.id}`);
				this.logger.error(`Error: ${error}`);
			}

			// update the total token consumed by this user
			// if the cost incurred is not zero, then we add a usage record
			if (userId) {
				try {
					await this.userService.addTokensConsumedAndCostByUser(userId, totalTokens, totalCost);
				} catch (error) {
					this.logger.error(`Failed to update tokensConsumed for user ${userId}`);
					this.logger.error(`Error: ${error}`);
				}

				try {
					if (totalCost > 0) {
						await this.usageService.addTransactionRecord({
							workflowId: workflowData.id,
							userId,
							executionDate: runData.startedAt,
							tokensConsumed: totalTokens,
							costIncurred: totalCost,
						});
					}
					this.logger.info(`Added usage record for user ${userId} for workflow ${workflowData.id}`);
					this.logger.info(
						`Usage record: ${JSON.stringify(await this.usageService.getUsageByWorkflowId(workflowData.id))}`,
					);
				} catch (error) {
					this.logger.error(
						`Failed to add usage record for user ${userId} for workflow ${workflowData.id}`,
					);
					this.logger.error(`Error: ${error}`);
				}
			}
		}

		// Determine the name of the statistic
		const isSuccess = runData.status === 'success';
		const manual = runData.mode === 'manual';
		let name: StatisticsNames;
		const isRootExecution =
			isModeRootExecution[runData.mode] && isStatusRootExecution[runData.status];

		if (isSuccess) {
			if (manual) name = StatisticsNames.manualSuccess;
			else name = StatisticsNames.productionSuccess;
		} else {
			if (manual) name = StatisticsNames.manualError;
			else name = StatisticsNames.productionError;
		}

		// Get the workflow id
		const workflowId = workflowData.id;
		if (!workflowId) return;

		try {
			const upsertResult = await this.repository.upsertWorkflowStatistics(
				name,
				workflowId,
				isRootExecution,
			);

			if (name === StatisticsNames.productionSuccess && upsertResult === 'insert') {
				const project = await this.ownershipService.getWorkflowProjectCached(workflowId);
				if (project.type === 'personal') {
					const owner = await this.ownershipService.getPersonalProjectOwnerCached(project.id);

					if (owner && !owner.settings?.userActivated) {
						await this.userService.updateSettings(owner.id, {
							firstSuccessfulWorkflowId: workflowId,
							userActivated: true,
							userActivatedAt: runData.startedAt.getTime(),
						});
					}

					this.eventService.emit('first-production-workflow-succeeded', {
						projectId: project.id,
						workflowId,
						userId: owner!.id,
					});
				}
			}
		} catch (error) {
			this.logger.debug('Unable to fire first workflow success telemetry event');
		}
	}

	async nodeFetchedData(workflowId: string | undefined | null, node: INode): Promise<void> {
		if (!workflowId) return;

		const insertResult = await this.repository.insertWorkflowStatistics(
			StatisticsNames.dataLoaded,
			workflowId,
		);
		if (insertResult === 'failed' || insertResult === 'alreadyExists') return;

		// Compile the metrics since this was a new data loaded event
		const project = await this.ownershipService.getWorkflowProjectCached(workflowId);
		const owner = await this.ownershipService.getPersonalProjectOwnerCached(project.id);

		let metrics = {
			userId: owner?.id ?? '', // team projects have no owner
			project: project.id,
			workflowId,
			nodeType: node.type,
			nodeId: node.id,
		};

		// This is probably naive but I can't see a way for a node to have multiple credentials attached so..
		if (node.credentials) {
			Object.entries(node.credentials).forEach(([credName, credDetails]) => {
				metrics = Object.assign(metrics, {
					credentialType: credName,
					credentialId: credDetails.id,
				});
			});
		}

		this.eventService.emit('first-workflow-data-loaded', metrics);
	}
}
