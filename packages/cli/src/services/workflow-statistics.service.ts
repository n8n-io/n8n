import { Logger } from '@n8n/backend-common';
import { StatisticsNames, WorkflowStatisticsRepository } from '@n8n/db';
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
	workflowExecutionCompleted: { workflowData: IWorkflowBase; fullRunData: IRun };
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
		private readonly ownershipService: OwnershipService,
		private readonly userService: UserService,
		private readonly eventService: EventService,
	) {
		super({ captureRejections: true });
		if ('SKIP_STATISTICS_EVENTS' in process.env) return;

		this.on(
			'nodeFetchedData',
			async ({ workflowId, node }) => await this.nodeFetchedData(workflowId, node),
		);
		this.on(
			'workflowExecutionCompleted',
			async ({ workflowData, fullRunData }) =>
				await this.workflowExecutionCompleted(workflowData, fullRunData),
		);
	}

	async workflowExecutionCompleted(workflowData: IWorkflowBase, runData: IRun): Promise<void> {
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
