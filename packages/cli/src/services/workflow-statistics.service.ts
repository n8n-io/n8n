import { Logger, TypedEmitter } from '@n8n/backend-common';
import { computeTimeSavedMinutes, EventService } from '@n8n/backend-services';
import type { CrashedExecution } from '@n8n/db';
import {
	ExecutionLedgerRepository,
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

import { UserService } from '@/services/user.service';

import { OwnershipService } from './ownership.service';

/** PostgreSQL INTEGER bounds, as Insights clamps runtimes to them. */
const MAX_RUNTIME_MS = 2 ** 31 - 1;

/** Measures a completed run carries in the ledger, for readers such as Insights. */
type RunMeasures = { runtimeMs: number | null; timeSavedMin: number | null };

function measureRun(workflowData: IWorkflowBase, runData: IRun): RunMeasures {
	const runtimeMs = runData.stoppedAt
		? Math.min(
				Math.max(runData.stoppedAt.getTime() - runData.startedAt.getTime(), 0),
				MAX_RUNTIME_MS,
			)
		: null;
	// Error workflows are operational, not productive work.
	const savesTime = runData.status === 'success' && runData.mode !== 'error';
	const timeSaved = savesTime ? computeTimeSavedMinutes(workflowData.settings, runData) : null;
	return {
		runtimeMs,
		timeSavedMin:
			timeSaved === null ? null : Number.isFinite(timeSaved) ? Math.round(timeSaved) : 0,
	};
}

type CompletedRunOutcome = {
	mode: WorkflowExecuteMode;
	status: ExecutionStatus;
};

export function getStatisticsNameForCompletedRun(
	runData: CompletedRunOutcome,
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
		private readonly ledgerRepository: ExecutionLedgerRepository,
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
			for (const { workflowId, workflowName, mode } of executions) {
				await this.recordExecutionOutcome({ workflowId, workflowName, mode, status: 'crashed' });
			}
		});
	}

	async workflowExecutionCompleted(
		workflowData: IWorkflowBase,
		runData: IRun,
		source?: WorkflowExecutionSource,
	): Promise<void> {
		const statisticsName = getStatisticsNameForCompletedRun(runData, source);
		if (!statisticsName) return;

		const workflowId = workflowData.id;
		if (!workflowId) return;

		await this.recordCompletedRun({
			workflowId,
			workflowName: workflowData.name,
			outcome: { mode: runData.mode, status: runData.status, source },
			measures: measureRun(workflowData, runData),
		});
	}

	private async recordExecutionOutcome({
		workflowId,
		workflowName,
		mode,
		status,
	}: { workflowId: string; workflowName?: string } & CompletedRunOutcome): Promise<void> {
		// Contain every failure: this runs from an emitter listener that captures
		// rejections and has no `error` handler, so a rejection would end the process.
		try {
			const outcome = { mode, status };
			const statisticsName = getStatisticsNameForCompletedRun(outcome);

			if (!statisticsName) return;

			await this.recordCompletedRun({ workflowId, workflowName, outcome });
		} catch (error) {
			this.logger.error('Failed to record the outcome of an execution', {
				workflowId,
				error: ensureError(error),
			});
		}
	}

	/** The ledger fold turns this row into counters, milestones, and Insights buckets. */
	private async recordCompletedRun({
		workflowId,
		workflowName,
		outcome,
		measures,
	}: {
		workflowId: string;
		workflowName?: string;
		outcome: CompletedRunOutcome & { source?: WorkflowExecutionSource };
		measures?: RunMeasures;
	}): Promise<void> {
		try {
			await this.ledgerRepository.appendFinished({
				workflowId,
				workflowName: workflowName ?? null,
				mode: outcome.mode,
				status: outcome.status,
				source: outcome.source ?? null,
				runtimeMs: measures?.runtimeMs ?? null,
				timeSavedMin: measures?.timeSavedMin ?? null,
			});
		} catch (error) {
			this.logger.error('Failed to record workflow statistic', { error: ensureError(error) });
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
