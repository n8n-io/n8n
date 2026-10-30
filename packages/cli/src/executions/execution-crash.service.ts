import { EventService, ExecutionLedger, toEndedFactsFromCrash } from '@n8n/backend-services';
import type { CrashedExecution, ResumableExecutionStatus } from '@n8n/db';
import { ExecutionRepository } from '@n8n/db';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';

import type { CrashDetector } from '@/events/maps/relay.event-map';
import { WorkflowStatisticsService } from '@/services/workflow-statistics.service';

/**
 * Marks executions as `crashed`. A crash transition runs no execution lifecycle
 * hooks, so the workflow statistics and the ledger `ended` rows are recorded from
 * here instead, and every claimed row is announced as `execution-crashed` from here.
 */
@Service()
export class ExecutionCrashService {
	constructor(
		private readonly executionRepository: ExecutionRepository,
		private readonly workflowStatisticsService: WorkflowStatisticsService,
		private readonly eventService: EventService,
		private readonly instanceSettings: InstanceSettings,
		private readonly executionLedger: ExecutionLedger,
	) {}

	async markAsCrashed(
		executionIds: string | string[],
		detector: CrashDetector,
	): Promise<CrashedExecution[]> {
		return await this.executionRepository.markAsCrashed(executionIds, (batch) => {
			this.count(batch);
			this.announce(batch, detector);
			this.recordEnded(batch);
		});
	}

	/** Mark a `waiting` or `new` execution as `crashed`, which `markAsCrashed` skips. */
	async markAsCrashedFrom(
		executionId: string,
		status: ResumableExecutionStatus,
		detector: CrashDetector,
		expectedAttempts?: number,
	): Promise<boolean> {
		return await this.executionRepository.markAsCrashedFrom(executionId, status, {
			expectedAttempts,
			onTransitioned: (batch) => {
				this.count(batch);
				this.announce(batch, detector);
			},
		});
	}

	/**
	 * Claim and announce without counting, for a caller that runs `workflowExecuteAfter`
	 * for the same executions, which counts them itself. A given `stoppedAt` replaces the
	 * claim time in the announcement, for a caller that knows when the work stopped.
	 */
	async markAsCrashedWithoutCounting(
		executionIds: string | string[],
		detector: CrashDetector,
		options: { stoppedAt?: Date } = {},
	): Promise<CrashedExecution[]> {
		return await this.executionRepository.markAsCrashed(executionIds, (batch) => {
			this.announce(batch, detector, options.stoppedAt);
			// The caller's hooks find the run already crashed, so they record no `ended` row.
			this.recordEnded(batch, options.stoppedAt);
		});
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
		this.recordEnded(crashed);

		return crashed;
	}

	/** Chained, so batches and sweeps insert one row at a time and do not take the whole pool. */
	private endedWrites = Promise.resolve();

	private recordEnded(executions: CrashedExecution[], stoppedAtOverride?: Date) {
		if (!this.executionLedger.isEnabled || executions.length === 0) return;

		const facts = executions.map((execution) =>
			toEndedFactsFromCrash(execution, stoppedAtOverride),
		);
		this.endedWrites = this.endedWrites.then(async () => {
			for (const fact of facts) await this.executionLedger.recordEnded(fact);
		});
	}

	private count(executions: CrashedExecution[]) {
		if (executions.length === 0) return;

		this.workflowStatisticsService.emit('executionsCrashed', { executions });
	}

	private announce(
		executions: CrashedExecution[],
		detector: CrashDetector,
		stoppedAtOverride?: Date,
	) {
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
				stoppedAt: stoppedAtOverride ?? stoppedAt,
				detector,
				hostId: this.instanceSettings.hostId,
				tracingContext,
				workflowCustomTelemetryTags,
				project,
			});
		}
	}
}
