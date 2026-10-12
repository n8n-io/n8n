import { TypedEmitter } from '@n8n/backend-common';
import { EventService } from '@n8n/backend-services';
import type { CrashedExecution } from '@n8n/db';
import {
	SettingsRepository,
	StatisticsNames,
	WorkflowRepository,
	WorkflowStatisticsRepository,
} from '@n8n/db';
import { Service } from '@n8n/di';
import type { INode, IRun, IWorkflowBase, WorkflowExecutionSource } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { UserService } from '@/services/user.service';
import { UsageRecorder } from '@/usage/usage-recorder.service';

import { INSTANCE_ACTIVATED_SETTINGS_KEY } from './instance-activation.service';
import { OwnershipService } from './ownership.service';

type WorkflowStatisticsEvents = {
	nodeFetchedData: { workflowId: string; node: INode; source?: WorkflowExecutionSource };
	workflowExecutionCompleted: {
		executionId: string;
		parentExecutionId?: string;
		workflowData: IWorkflowBase;
		fullRunData: IRun;
		source?: WorkflowExecutionSource;
	};
	executionsCrashed: { executions: CrashedExecution[] };
};

@Service()
export class WorkflowStatisticsService extends TypedEmitter<WorkflowStatisticsEvents> {
	constructor(
		private readonly repository: WorkflowStatisticsRepository,
		private readonly ownershipService: OwnershipService,
		private readonly userService: UserService,
		private readonly eventService: EventService,
		private readonly settingsRepository: SettingsRepository,
		private readonly workflowRepository: WorkflowRepository,
		private readonly usageRecorder: UsageRecorder,
	) {
		super({ captureRejections: true });
		if ('SKIP_STATISTICS_EVENTS' in process.env) return;

		this.on(
			'nodeFetchedData',
			async ({ workflowId, node, source }) => await this.nodeFetchedData(workflowId, node, source),
		);
		this.on(
			'workflowExecutionCompleted',
			async ({ executionId, parentExecutionId, workflowData, fullRunData, source }) =>
				await this.workflowExecutionCompleted(
					workflowData,
					fullRunData,
					source,
					executionId,
					parentExecutionId,
				),
		);
		this.on('executionsCrashed', async ({ executions }) => {
			// Record one at a time, to keep a large sweep within the database connection pool.
			for (const { id, workflowId, workflowName, mode, startedAt, stoppedAt } of executions) {
				await this.usageRecorder.recordWorkflowRun({
					executionId: id,
					workflowId,
					workflowName,
					mode,
					status: 'crashed',
					startedAt,
					endedAt: stoppedAt,
				});
			}
		});
	}

	/** Record a finished run. The usage fold updates the counters and fires the milestones. */
	async workflowExecutionCompleted(
		workflowData: IWorkflowBase,
		runData: IRun,
		source?: WorkflowExecutionSource,
		executionId?: string,
		parentExecutionId?: string,
	): Promise<void> {
		const workflowId = workflowData.id;
		if (!workflowId) return;

		await this.usageRecorder.recordWorkflowRun({
			// Without an execution id the fact cannot be deduplicated, only counted.
			executionId: executionId ?? randomUUID(),
			workflowId,
			workflowName: workflowData.name,
			mode: runData.mode,
			status: runData.status,
			source,
			startedAt: runData.startedAt,
			endedAt: runData.stoppedAt ?? new Date(),
			parentExecutionId: parentExecutionId ?? runData.data.parentExecution?.executionId,
		});
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

		await this.recordInstanceActivation(project.id, workflowId, userId, userActivatedAtMs);
	}

	/**
	 * Record the instance's activation moment, exactly once, whatever the project type.
	 *
	 * The per-user `userActivated` flag above only covers personal projects, so an instance whose
	 * first success happens in a team project would otherwise never look activated. Guarded by a
	 * settings row, mirroring `instance.firstProductionFailure`. The row is the whole contract —
	 * {@link InstanceActivationService} reads it — so there is no accompanying event.
	 */
	private async recordInstanceActivation(
		projectId: string,
		workflowId: string,
		userId: string | null,
		activatedAt: number,
	): Promise<void> {
		await this.settingsRepository.insertIfAbsent(
			INSTANCE_ACTIVATED_SETTINGS_KEY,
			JSON.stringify({ workflowId, projectId, userId, timestamp: activatedAt }),
		);
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
