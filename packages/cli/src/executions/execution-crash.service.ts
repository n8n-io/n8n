import { EventService } from '@n8n/backend-services';
import type { CrashedExecution } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import type { CrashDetector } from '@/events/maps/relay.event-map';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

/**
 * Marks executions as `crashed`. A crash transition runs no execution lifecycle
 * hooks, so the workflow statistics are counted from here instead, and every
 * claimed row is announced as `execution-crashed` from here.
 */
@Service()
export class ExecutionCrashService {
	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowStatisticsService: WorkflowStatisticsService,
		private readonly eventService: EventService,
		private readonly instanceSettings: InstanceSettings,
	) {}

	async markAsCrashed(
		executionIds: string | string[],
		detector: CrashDetector,
	): Promise<CrashedExecution[]> {
		return await this.executionRepository.markAsCrashed(executionIds, (batch) => {
			this.count(batch);
			this.announce(batch, detector);
		});
	}

	/**
	 * Claim and announce without counting, for a caller that runs `workflowExecuteAfter`
	 * for the same executions, which counts them itself.
	 */
	async markAsCrashedWithoutCounting(
		executionIds: string | string[],
		detector: CrashDetector,
	): Promise<CrashedExecution[]> {
		return await this.executionRepository.markAsCrashed(executionIds, (batch) =>
			this.announce(batch, detector),
		);
	}

	/**
	 * Announce an execution the caller already transitioned to `crashed` itself.
	 * Performs no transition and no counting; the caller's lifecycle hooks count it.
	 */
	async announceStalledExecution(executionId: string): Promise<void> {
		const execution = await this.executionRepository.findSingleExecution(executionId, {
			includeData: false,
		});
		if (!execution || execution.status !== 'crashed' || !execution.stoppedAt) return;

		this.announce(
			[
				{
					id: execution.id,
					workflowId: execution.workflowId,
					mode: execution.mode,
					startedAt: execution.startedAt ?? null,
					stoppedAt: execution.stoppedAt,
					retryOf: execution.retryOf ?? undefined,
					workflowVersionId: execution.workflowVersionId ?? undefined,
					tracingContext: execution.tracingContext ?? undefined,
				},
			],
			'stall',
		);
	}

	async markWorkflowExecutionsAsCrashed(workflowId: string): Promise<CrashedExecution[]> {
		const crashed = await this.executionRepository.markWorkflowExecutionsAsCrashed(workflowId);

		this.count(crashed);
		this.announce(crashed, 'workflow-deactivation');

		return crashed;
	}

	private count(executions: CrashedExecution[]) {
		if (executions.length === 0) return;

		this.workflowStatisticsService.emit('executionsCrashed', { executions });
	}

	private announce(executions: CrashedExecution[], detector: CrashDetector) {
		for (const {
			id,
			workflowId,
			workflowName,
			workflowVersionId,
			mode,
			retryOf,
			startedAt,
			stoppedAt,
			tracingContext,
			workflowCustomTelemetryTags,
			project,
		} of executions) {
			this.eventService.emit('execution-crashed', {
				executionId: id,
				workflowId,
				workflowName,
				workflowVersionId,
				mode,
				retryOf,
				startedAt: startedAt ?? undefined,
				stoppedAt,
				detector,
				hostId: this.instanceSettings.hostId,
				tracingContext,
				workflowCustomTelemetryTags,
				project,
			});
		}
	}
}
