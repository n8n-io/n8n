import { Logger, TypedEmitter } from '@n8n/backend-common';
import { DatabaseConfig } from '@n8n/config';
import {
	SettingsRepository,
	StatisticsNames,
	WorkflowRepository,
	WorkflowStatisticsRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import {
	isCompletedExecutionStatus,
	type ExecutionStatus,
	type INode,
	type IRun,
	type IWorkflowBase,
	type WorkflowExecuteMode,
	type WorkflowExecutionSource,
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

function getStatisticsNameForCompletedRun(
	runData: IRun,
	source?: WorkflowExecutionSource,
): StatisticsNames | null {
	const isChatExecution = runData.mode === 'chat';
	if (isChatExecution || !isCompletedExecutionStatus(runData.status)) {
		return null;
	}

	// Instance AI verification runs mimic the trigger's execution mode, but they
	// are test runs on the user's behalf — count them as manual so they never
	// land in production stats or fire first-production milestones.
	const isManualExecution = runData.mode === 'manual' || source === 'instance_ai';
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
	nodeFetchedData: { workflowId: string; node: INode; source?: WorkflowExecutionSource };
	workflowExecutionCompleted: {
		workflowData: IWorkflowBase;
		fullRunData: IRun;
		source?: WorkflowExecutionSource;
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
		private readonly settingsRepository: SettingsRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly databaseConfig: DatabaseConfig,
	) {
		super({ captureRejections: true });
		if ('SKIP_STATISTICS_EVENTS' in process.env) return;

		this.on(
			'nodeFetchedData',
			async ({ workflowId, node, source }) => await this.nodeFetchedData(workflowId, node, source),
		);
		this.on(
			'workflowExecutionCompleted',
			async ({ workflowData, fullRunData, source }) =>
				await this.workflowExecutionCompleted(workflowData, fullRunData, source),
		);
	}

	async workflowExecutionCompleted(
		workflowData: IWorkflowBase,
		runData: IRun,
		source?: WorkflowExecutionSource,
	): Promise<void> {
		const statisticsName = getStatisticsNameForCompletedRun(runData, source);

		// Instance AI runs mimic trigger modes but are not root production runs.
		const isRoot = source !== 'instance_ai' && isRootExecutionForRun(runData);

		if (!statisticsName) return;

		const workflowId = workflowData.id;
		if (!workflowId) return;

		let upsertResult: Awaited<ReturnType<WorkflowStatisticsRepository['upsertWorkflowStatistics']>>;

		try {
			/**
			 * For performance reasons, in Postgres we append and fold out of band,
			 * whereas in SQLite we upsert directly.
			 */
			if (this.databaseConfig.type === 'postgresdb') {
				await this.repository.appendIncrement(
					statisticsName,
					workflowId,
					isRoot,
					workflowData.name,
				);
				return;
			}

			upsertResult = await this.repository.upsertWorkflowStatistics(
				statisticsName,
				workflowId,
				isRoot,
				workflowData.name,
			);
		} catch (error) {
			this.logger.error('Failed to record workflow statistic', { error: ensureError(error) });
			return;
		}

		if (upsertResult !== 'insert') return;

		try {
			await this.emitFirstOccurrenceEvent(
				statisticsName,
				workflowId,
				workflowData.name ?? null,
				runData.startedAt.getTime(),
			);
		} catch (error) {
			this.logger.debug('Failed to emit workflow statistics milestone', {
				error: ensureError(error),
			});
		}
	}

	/** Emit an event on first production success or first production failure. */
	async emitFirstOccurrenceEvent(
		statisticsName: StatisticsNames,
		workflowId: string,
		workflowName: string | null,
		firstEventMs: number,
	): Promise<void> {
		if (statisticsName === StatisticsNames.productionSuccess) {
			await this.emitFirstProductionWorkflowSucceeded(workflowId, firstEventMs);
			return;
		}

		if (statisticsName === StatisticsNames.productionError) {
			await this.emitInstanceFirstProductionWorkflowFailed(
				workflowId,
				workflowName ?? '',
				firstEventMs,
			);
		}
	}

	private async emitFirstProductionWorkflowSucceeded(
		workflowId: string,
		userActivatedAtMs: number,
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
					userActivatedAt: userActivatedAtMs,
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
		workflowId: string,
		workflowName: string,
		timestampMs: number,
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
				timestamp: timestampMs,
			}),
			loadOnStartup: false,
		});

		this.eventService.emit('instance-first-production-workflow-failed', {
			projectId: project.id,
			workflowId,
			workflowName,
			userId: owner.id,
		});
	}

	async nodeFetchedData(
		workflowId: string | undefined | null,
		node: INode,
		source?: WorkflowExecutionSource,
	): Promise<void> {
		if (!workflowId) return;

		// Instance AI verification runs must not claim a workflow's
		// first-data-loaded milestone on the user's behalf.
		if (source === 'instance_ai') return;

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
