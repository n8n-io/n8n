import type { CrashedExecution } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import { EventService } from '@/events/event.service';
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
			mode,
			startedAt,
			stoppedAt,
			tracingContext,
		} of executions) {
			this.eventService.emit('execution-crashed', {
				executionId: id,
				workflowId,
				workflowName,
				mode,
				startedAt: startedAt ?? undefined,
				stoppedAt,
				detector,
				hostId: this.instanceSettings.hostId,
				tracingContext,
			});
		}
	}
}
