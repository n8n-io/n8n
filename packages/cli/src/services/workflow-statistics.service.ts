import { Logger, TypedEmitter } from '@n8n/backend-common';
import {
	SettingsRepository,
	StatisticsNames,
	WorkflowRepository,
	WorkflowStatisticsRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import {
	isCompletedExecutionStatus,
	type ExecutionStatus,
	type INode,
	type IRun,
	type IWorkflowBase,
	type WorkflowExecuteMode,
} from 'n8n-workflow';

import { EventService } from '@/events/event.service';
import { UserService } from '@/services/user.service';

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
	retry: true,
	trigger: true,
	webhook: true,
	evaluation: true,

	// sub workflows
	integrated: false,

	// error workflows
	error: false,

	internal: false,

	manual: false,

	// n8n Chat hub messages
	chat: false,

	// Agent executions
	agent: false,
} satisfies Record<WorkflowExecuteMode, boolean>;

function getStatisticsNameForCompletedRun(runData: IRun): StatisticsNames | null {
	const isChatExecution = runData.mode === 'chat';
	if (isChatExecution || !isCompletedExecutionStatus(runData.status)) {
		return null;
	}

	const isManualExecution = runData.mode === 'manual';
	if (isManualExecution) {
		return runData.status === 'success'
			? StatisticsNames.manualSuccess
			: StatisticsNames.manualError;
	}

	return runData.status === 'success'
		? StatisticsNames.productionSuccess
		: StatisticsNames.productionError;
}

function isRootExecutionForRun(runData: IRun): boolean {
	return isModeRootExecution[runData.mode] && isStatusRootExecution[runData.status];
}

type WorkflowStatisticsEvents = {
	nodeFetchedData: { workflowId: string; node: INode };
	workflowExecutionCompleted: { workflowData: IWorkflowBase; fullRunData: IRun };
};

@Service()
export class WorkflowStatisticsService extends TypedEmitter<WorkflowStatisticsEvents> {
	constructor(
		private readonly logger: Logger,
		private readonly repository: WorkflowStatisticsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly userService: UserService,
		private readonly eventService: EventService,
		private readonly settingsRepository: SettingsRepository,
		private readonly workflowRepository: WorkflowRepository,
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
		const statisticsName = getStatisticsNameForCompletedRun(runData);
		if (!statisticsName) return;

		const workflowId = workflowData.id;
		if (!workflowId) return;

		try {
			const upsertResult = await this.repository.upsertWorkflowStatistics(
				statisticsName,
				workflowId,
				isRootExecutionForRun(runData),
				workflowData.name,
			);

			if (upsertResult !== 'insert') return;

			if (statisticsName === StatisticsNames.productionSuccess) {
				await this.emitFirstProductionWorkflowSucceeded(workflowId, runData);
			} else if (statisticsName === StatisticsNames.productionError) {
				await this.emitInstanceFirstProductionWorkflowFailed(workflowData, workflowId, runData);
			}
		} catch (error) {
			this.logger.debug('Unable to fire first workflow telemetry event');
		}
	}

	private async emitFirstProductionWorkflowSucceeded(
		workflowId: string,
		runData: IRun,
	): Promise<void> {
		const project = await this.ownershipService.getWorkflowProjectCached(workflowId);
		let userId: string | null = null;

		if (project.type === 'personal') {
			const owner = await this.ownershipService.getPersonalProjectOwnerCached(project.id);
			userId = owner?.id ?? null;

			if (owner && !owner.settings?.userActivated) {
				await this.userService.updateSettings(owner.id, {
					firstSuccessfulWorkflowId: workflowId,
					userActivated: true,
					userActivatedAt: runData.startedAt.getTime(),
				});
			}
		}

		this.eventService.emit('first-production-workflow-succeeded', {
			projectId: project.id,
			workflowId,
			userId,
		});
	}

	private async emitInstanceFirstProductionWorkflowFailed(
		workflowData: IWorkflowBase,
		workflowId: string,
		runData: IRun,
	): Promise<void> {
		const instanceHadProductionFailure = await this.settingsRepository.findByKey(
			'instance.firstProductionFailure',
		);

		if (
			instanceHadProductionFailure ||
			(await this.workflowRepository.hasAnyWorkflowsWithErrorWorkflow())
		) {
			return;
		}

		const project = await this.ownershipService.getWorkflowProjectCached(workflowId);

		let owner =
			project.type === 'personal'
				? await this.ownershipService.getPersonalProjectOwnerCached(project.id)
				: null;

		owner ??= await this.ownershipService.getInstanceOwner();

		await this.settingsRepository.save({
			key: 'instance.firstProductionFailure',
			value: JSON.stringify({
				workflowId,
				projectId: project.id,
				userId: owner.id,
				timestamp: runData.startedAt.getTime(),
			}),
			loadOnStartup: false,
		});

		this.eventService.emit('instance-first-production-workflow-failed', {
			projectId: project.id,
			workflowId,
			workflowName: workflowData.name,
			userId: owner.id,
		});
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
