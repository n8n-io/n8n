import { Logger, TypedEmitter } from '@n8n/backend-common';
import { EventService, ExecutionLedger, toWorkflowStatisticsCount } from '@n8n/backend-services';
import { DatabaseConfig } from '@n8n/config';
import type { CrashedExecution } from '@n8n/db';
import {
	isPerson,
	SettingsRepository,
	StatisticsNames,
	WorkflowRepository,
	WorkflowStatisticsRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import {
	type ExecutionStatus,
	type INode,
	type IRun,
	type IWorkflowBase,
	type WorkflowExecuteMode,
	type WorkflowExecutionSource,
} from 'n8n-workflow';

import { UserService } from '@/services/user.service';

import { OwnershipService } from './ownership.service';

type CompletedRunOutcome = {
	mode: WorkflowExecuteMode;
	status: ExecutionStatus;
};

type WorkflowStatisticsEvents = {
	nodeFetchedData: { workflowId: string; node: INode; source?: WorkflowExecutionSource };
	workflowExecutionCompleted: {
		workflowData: IWorkflowBase;
		fullRunData: IRun;
		source?: WorkflowExecutionSource;
	};
	executionsCrashed: { executions: CrashedExecution[] };
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
		private readonly executionLedger: ExecutionLedger,
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
		this.on('executionsCrashed', async ({ executions }) => {
			// Record one at a time, to keep a large sweep within the database connection pool.
			for (const { workflowId, workflowName, mode, startedAt } of executions) {
				await this.recordExecutionOutcome({
					workflowId,
					workflowName,
					mode,
					status: 'crashed',
					startedAt,
				});
			}
		});
	}

	async workflowExecutionCompleted(
		workflowData: IWorkflowBase,
		runData: IRun,
		source?: WorkflowExecutionSource,
	): Promise<void> {
		const counted = toWorkflowStatisticsCount(runData, source);
		if (!counted) return;

		const workflowId = workflowData.id;
		if (!workflowId) return;

		await this.recordCompletedRun({
			statisticsName: counted.name,
			workflowId,
			workflowName: workflowData.name,
			isRoot: counted.isRoot,
			firstEventMs: runData.startedAt.getTime(),
		});
	}

	private async recordExecutionOutcome({
		workflowId,
		workflowName,
		mode,
		status,
		startedAt,
	}: {
		workflowId: string;
		workflowName?: string;
		startedAt: Date | null;
	} & CompletedRunOutcome): Promise<void> {
		// Contain every failure: this runs from an emitter listener that captures
		// rejections and has no `error` handler, so a rejection would end the process.
		try {
			const counted = toWorkflowStatisticsCount({ mode, status, startedAt });
			if (!counted) return;

			await this.recordCompletedRun({
				statisticsName: counted.name,
				workflowId,
				workflowName,
				isRoot: counted.isRoot,
				firstEventMs: Date.now(),
			});
		} catch (error) {
			this.logger.error('Failed to record the outcome of an execution', {
				workflowId,
				error: ensureError(error),
			});
		}
	}

	private async recordCompletedRun({
		statisticsName,
		workflowId,
		workflowName,
		isRoot,
		firstEventMs,
	}: {
		statisticsName: StatisticsNames;
		workflowId: string;
		workflowName?: string;
		isRoot: boolean;
		firstEventMs: number;
	}): Promise<void> {
		// With the ledger on, its fold step writes these counters. Both writers would count twice.
		if (this.executionLedger.isEnabled) return;

		let upsertResult: Awaited<ReturnType<WorkflowStatisticsRepository['upsertWorkflowStatistics']>>;

		try {
			/**
			 * For performance reasons, in Postgres we append and fold out of band,
			 * whereas in SQLite we upsert directly.
			 */
			if (this.databaseConfig.type === 'postgresdb') {
				await this.repository.appendIncrement(statisticsName, workflowId, isRoot, workflowName);
				return;
			}

			upsertResult = await this.repository.upsertWorkflowStatistics(
				statisticsName,
				workflowId,
				isRoot,
				workflowName,
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
				workflowName ?? null,
				firstEventMs,
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

			if (owner && isPerson(owner) && !owner.settings?.userActivated) {
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

		const isFirstFailure = await this.settingsRepository.insertIfAbsent(
			'instance.firstProductionFailure',
			JSON.stringify({
				workflowId,
				projectId: project.id,
				userId: owner.id,
				timestamp: timestampMs,
			}),
		);
		if (!isFirstFailure) {
			return;
		}

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
