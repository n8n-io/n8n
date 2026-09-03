import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { ExecutionStatus, IRunData, ITaskData, TerminalExecutionStatus } from 'n8n-workflow';
import { isTerminalExecutionStatus, WorkflowOperationError } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import type { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import {
	AgentBackgroundJobRepository,
	type AgentBackgroundJobSettlement,
	type NewSubAgentJob,
	type NewWorkflowJob,
} from '../repositories/agent-background-job.repository';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';

/** Bounds live sub-agent runs per thread. Workflow jobs are parked executions and are exempt. */
export const MAX_RUNNING_JOBS_PER_THREAD = 5;
export const SUB_AGENT_BACKGROUND_TIMEOUT_MS = 30 * Time.minutes.toMilliseconds;
export const SETTLED_JOB_RETENTION_MS = 30 * Time.days.toMilliseconds;

export type BackgroundJobReceipt =
	| { status: 'started'; jobId: string }
	| { status: 'limit-reached' };

export type BackgroundJobView = Pick<
	AgentBackgroundJob,
	| 'id'
	| 'kind'
	| 'title'
	| 'status'
	| 'result'
	| 'error'
	| 'createdAt'
	| 'timeoutAt'
	| 'settledAt'
	| 'childExecutionId'
>;

/** Cap on the result text persisted on a workflow job row. */
export const WORKFLOW_JOB_RESULT_MAX_CHARS = 8000;

/**
 * Error recorded on a job whose execution vanished before its outcome was
 * read.
 */
export const EXECUTION_OUTCOME_UNKNOWN_ERROR =
	'The workflow execution was not retained (check the workflow’s save settings), so its outcome is unknown — it may have completed. Do not run the workflow again without checking for its effects.';

/** Completed workflow execution status -> job status */
export function settlementStatusForExecution(
	status: TerminalExecutionStatus,
): 'completed' | 'failed' | 'cancelled' {
	if (status === 'success') return 'completed';
	if (status === 'canceled') return 'cancelled';
	return 'failed';
}

/** Extract the JSON items produced by the last run of a node. */
function outputItemsFromNodeRuns(nodeRuns: ITaskData[]): unknown[] {
	const lastRun = nodeRuns[nodeRuns.length - 1];
	if (!lastRun?.data?.main) return [];
	return lastRun.data.main.flatMap((items) => items ?? []).map((item) => item.json);
}

/** Build the resultData map from an execution's runData. */
export function collectResultData(runData: IRunData, allOutputs: boolean): Record<string, unknown> {
	const resultData: Record<string, unknown> = {};

	if (allOutputs) {
		for (const [nodeName, nodeRuns] of Object.entries(runData)) {
			const outputItems = outputItemsFromNodeRuns(nodeRuns);
			if (outputItems.length > 0) {
				resultData[nodeName] = outputItems;
			}
		}
		return resultData;
	}

	const nodeNames = Object.keys(runData);
	const lastNodeName = nodeNames[nodeNames.length - 1];
	if (lastNodeName) {
		const outputItems = outputItemsFromNodeRuns(runData[lastNodeName]);
		if (outputItems.length > 0) {
			resultData[lastNodeName] = outputItems;
		}
	}
	return resultData;
}

/**
 * Serialize a workflow's result data for the job row, with truncation.
 */
export function serializeWorkflowJobResult(
	resultData: Record<string, unknown> | undefined,
): string | null {
	if (!resultData || Object.keys(resultData).length === 0) return null;

	let serialized: string;
	try {
		serialized = JSON.stringify(resultData);
	} catch {
		return null;
	}
	if (serialized.length <= WORKFLOW_JOB_RESULT_MAX_CHARS) return serialized;
	return `${serialized.slice(0, WORKFLOW_JOB_RESULT_MAX_CHARS)}… [truncated, full data on execution]`;
}

/**
 * Registry of durable background jobs dispatched by top-level agents. The job
 * row is the receipt handed to the model and the single source of truth for
 * status checks.
 */
@Service()
export class AgentBackgroundJobService {
	private readonly abortControllers = new Map<string, AbortController>();

	constructor(
		private readonly jobRepository: AgentBackgroundJobRepository,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly publisher: Publisher,
		private readonly logger: Logger,
		private readonly agentsConfig: AgentsConfig,
	) {
		this.logger = this.logger.scoped('agents');
	}

	/**
	 * Register a sub-agent job. The receipt follows the spawn contract:
	 * `limit-reached` when the thread already has the maximum running sub-agent
	 * jobs, else `started`.
	 */
	async registerSubAgentJob(
		params: Omit<NewSubAgentJob, 'kind' | 'timeoutAt'>,
	): Promise<BackgroundJobReceipt> {
		const running = await this.jobRepository.countRunningSubAgentsByParentThread(
			params.parentThreadId,
		);
		if (running >= MAX_RUNNING_JOBS_PER_THREAD) return { status: 'limit-reached' };

		await this.jobRepository.insertJob({
			...params,
			kind: 'subagent',
			timeoutAt: new Date(Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS),
		});

		return { status: 'started', jobId: params.id };
	}

	/**
	 * Register a workflow execution parked at a Wait node as a background job.
	 */
	async registerWorkflowJob(
		params: Omit<NewWorkflowJob, 'kind' | 'childExecutionId'> & { executionId: string },
	): Promise<BackgroundJobReceipt> {
		const { executionId, ...job } = params;

		const outcome = await this.jobRepository.insertWorkflowJobOrGetExisting({
			...job,
			kind: 'workflow',
			childExecutionId: executionId,
		});

		return { status: 'started', jobId: outcome.inserted ? params.id : outcome.existing.id };
	}

	/** Settle the workflow job tracking the given execution; no-op without a running row. */
	async settleWorkflowJobByExecutionId(
		executionId: string,
		settlement: AgentBackgroundJobSettlement,
	): Promise<boolean> {
		const job = await this.jobRepository.findRunningWorkflowJobByExecutionId(executionId);
		if (!job) return false;

		return await this.settle(job.id, settlement);
	}

	async settle(jobId: string, settlement: AgentBackgroundJobSettlement): Promise<boolean> {
		try {
			const settled = await this.jobRepository.settleIfRunning(jobId, settlement);
			if (settled) await this.requestWakeSafely(jobId);
			return settled;
		} finally {
			// Drop the handle even when the write throws — a leaked entry would
			// shield the still-running row from orphan reconciliation forever.
			this.abortControllers.delete(jobId);
		}
	}

	async markMailConsumed(parentThreadId: string, jobIds: string[]): Promise<number> {
		return await this.jobRepository.markMailConsumed(parentThreadId, jobIds);
	}

	registerAbortController(jobId: string, controller: AbortController): void {
		this.abortControllers.set(jobId, controller);
	}

	/**
	 * Jobs of the given thread, with running rows reconciled first.
	 */
	async listForThread(parentThreadId: string, ids?: string[]): Promise<BackgroundJobView[]> {
		let jobs = await this.jobRepository.findByParentThread(parentThreadId, ids);

		const settledSubAgents = await this.failOrphanedSubAgentJobs(jobs);
		const settledWorkflows = await this.settleFinishedWorkflowJobs(jobs);
		if (settledSubAgents || settledWorkflows) {
			jobs = await this.jobRepository.findByParentThread(parentThreadId, ids);
		}

		return jobs.map((job) => ({
			id: job.id,
			kind: job.kind,
			title: job.title,
			status: job.status,
			result: job.result,
			error: job.error,
			createdAt: job.createdAt,
			timeoutAt: job.timeoutAt,
			settledAt: job.settledAt,
			childExecutionId: job.childExecutionId,
		}));
	}

	/**
	 * Cancel a job. A sub-agent row is claimed as cancelled first and its live
	 * run aborted second, so the aborted run's own settle write loses to the
	 * claim. When this process holds the handle the abort is direct; otherwise
	 * the spawning main is reached via pubsub. A workflow job stops its
	 * execution first instead; see `cancelWorkflowJob`.
	 */
	async cancel(
		parentThreadId: string,
		jobId: string,
	): Promise<'cancelled' | 'not-found' | 'already-settled'> {
		const [job] = await this.jobRepository.findByParentThread(parentThreadId, [jobId]);
		if (!job) return 'not-found';
		if (job.status !== 'running') return 'already-settled';

		if (job.kind === 'workflow') return await this.cancelWorkflowJob(job);

		const claimed = await this.jobRepository.settleIfRunning(jobId, { status: 'cancelled' });
		if (!claimed) return 'already-settled';

		const controller = this.abortControllers.get(jobId);
		if (controller) {
			controller.abort();
			this.abortControllers.delete(jobId);
		} else {
			// publishCommand is a no-op outside queue mode, where a foreign live
			// handle cannot exist anyway — reconciliation covers crashed spawners.
			// The row is already claimed, so a failed relay must not surface as a
			// tool error; the run then ends at its timeout instead of the abort.
			try {
				await this.publisher.publishCommand({
					command: 'cancel-agent-background-job',
					payload: { jobId },
				});
			} catch (error) {
				this.logger.warn('Failed to relay background job cancellation', { jobId, error });
			}
		}

		await this.consumeCancelledMail(parentThreadId, jobId);
		return 'cancelled';
	}

	private async requestWakeSafely(jobId: string): Promise<void> {
		if (!this.agentsConfig.backgroundTasksEnabled) return;

		try {
			const job = await this.jobRepository.findById(jobId);
			if (!job) return;
			const { AgentWakeService } = await import('./agent-wake.service.js');
			await Container.get(AgentWakeService).requestWake(job.parentThreadId);
		} catch (error) {
			this.logger.warn('Failed to request a parent wake for a settled background job', {
				jobId,
				error,
			});
		}
	}

	@OnPubSubEvent('cancel-agent-background-job', { instanceType: 'main' })
	handleCancelRelay({ jobId }: { jobId: string }): void {
		const controller = this.abortControllers.get(jobId);
		if (!controller) return;

		controller.abort();
		this.abortControllers.delete(jobId);
		this.logger.debug('Aborted background job after relayed cancellation', { jobId });
	}

	/**
	 * Resolve job rows that no live process will ever settle. Called from the
	 * interrupted-execution sweep; every write goes through the guarded settle,
	 * so overlapping sweeps on multiple mains converge on the first writer.
	 */
	async reconcile(): Promise<void> {
		await this.failJobsPastTimeout();
		await this.failOrphanedSubAgentJobs(await this.jobRepository.findRunningJobs('subagent'));
		await this.reconcileWorkflowJobs();
	}

	/**
	 * The workflow-job slice of reconciliation. Runs regardless of the feature
	 * flag — workflow jobs settle from execution state alone, and rows created
	 * while the flag was on must not strand as `running` after it is turned
	 * off. Both steps are no-ops when the table has no matching rows.
	 */
	async reconcileWorkflowJobs(): Promise<void> {
		await this.settleFinishedWorkflowJobs(await this.jobRepository.findRunningJobs('workflow'));

		await this.jobRepository.deleteSettledBefore(new Date(Date.now() - SETTLED_JOB_RETENTION_MS));
	}

	/**
	 * Stop the execution first, then claim the row. A workflow job has no
	 * timeout, so a row claimed before a failed stop would tell the model the
	 * workflow stopped while it keeps waiting. An unexpected stop failure is
	 * rethrown with the row still running, so the cancel can be retried. An
	 * execution that already finished (or is gone) is left to reconciliation,
	 * which records its real outcome.
	 */
	private async cancelWorkflowJob(
		job: AgentBackgroundJob,
	): Promise<'cancelled' | 'already-settled'> {
		if (job.childExecutionId !== null && job.workflowId !== null) {
			// Lazy: ExecutionService is a heavy dependency this service otherwise
			// never needs — workers load this class for the settle path alone.
			const { ExecutionService } = await import('@/executions/execution.service.js');
			const { MissingExecutionStopError } = await import(
				'@/errors/missing-execution-stop.error.js'
			);
			try {
				await Container.get(ExecutionService).stop(job.childExecutionId, [job.workflowId]);
			} catch (error) {
				if (error instanceof MissingExecutionStopError || error instanceof WorkflowOperationError) {
					this.logger.debug('Workflow job execution was already beyond stopping', {
						jobId: job.id,
						executionId: job.childExecutionId,
					});
					return 'already-settled';
				}

				this.logger.error('Failed to stop a workflow job execution — it may still be running', {
					jobId: job.id,
					executionId: job.childExecutionId,
					error: error instanceof Error ? error.message : String(error),
				});

				throw error;
			}
		}

		// The stopped execution's settle hook may have written `cancelled` first;
		// either way the job is cancelled.
		await this.jobRepository.settleIfRunning(job.id, { status: 'cancelled' });
		await this.consumeCancelledMail(job.parentThreadId, job.id);
		return 'cancelled';
	}

	/**
	 * The model already saw the cancel result, so its mail is consumed. This
	 * runs after the stop so a failed write cannot leave the child running,
	 * and a failure only means one redundant wake later.
	 */
	private async consumeCancelledMail(parentThreadId: string, jobId: string): Promise<void> {
		try {
			await this.jobRepository.markMailConsumed(parentThreadId, [jobId]);
		} catch (error) {
			this.logger.warn('Failed to consume mail of a cancelled background job', { jobId, error });
		}
	}

	/**
	 * Settle running workflow jobs whose execution already reached a terminal
	 * state — the settle hook never ran (crash) or lost the registration race.
	 * A completed execution's output is read back from the executions table so
	 * whichever writer wins the guarded settle carries the result. An execution
	 * that no longer exists was hard-deleted per the workflow's save settings,
	 * which seals the outcome as unknowable — the job fails with wording that
	 * says so. Returns whether any row was settled.
	 */
	private async settleFinishedWorkflowJobs(jobs: AgentBackgroundJob[]): Promise<boolean> {
		const candidates = jobs.filter(
			(job): job is AgentBackgroundJob & { childExecutionId: string } =>
				job.kind === 'workflow' && job.status === 'running' && job.childExecutionId !== null,
		);
		if (candidates.length === 0) return false;

		let statuses: Map<string, ExecutionStatus>;
		try {
			const rows = await this.executionPersistence.findStatusesByIds(
				candidates.map((job) => job.childExecutionId),
			);
			statuses = new Map(rows.map((row) => [row.id, row.status]));
		} catch (error) {
			this.logger.error('Failed to read execution statuses for workflow background jobs', {
				error,
			});
			return false;
		}

		let settledAny = false;
		for (const job of candidates) {
			const executionId = job.childExecutionId;
			const executionStatus = statuses.get(executionId);

			try {
				if (executionStatus === undefined) {
					settledAny =
						(await this.settle(job.id, {
							status: 'failed',
							error: EXECUTION_OUTCOME_UNKNOWN_ERROR,
						})) || settledAny;
					continue;
				}
				if (!isTerminalExecutionStatus(executionStatus)) continue;

				const status = settlementStatusForExecution(executionStatus);
				settledAny =
					(await this.settle(job.id, {
						status,
						result: status === 'completed' ? await this.loadExecutionResult(executionId) : null,
						error: executionStatus === 'success' ? null : `Execution ${executionStatus}`,
					})) || settledAny;
			} catch (error) {
				this.logger.error('Failed to reconcile workflow background job', {
					jobId: job.id,
					executionId,
					error,
				});
			}
		}

		return settledAny;
	}

	/** Serialized all-node output of a finished execution, for a settle whose run data is not in memory. */
	private async loadExecutionResult(executionId: string): Promise<string | null> {
		// A failed data read must not block the settle: workflow jobs have no
		// timeout, so a row skipped here could stay running forever.
		try {
			const execution = await this.executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			const runData = execution?.data?.resultData?.runData;
			if (!runData) return null;

			return serializeWorkflowJobResult(collectResultData(runData, false));
		} catch (error) {
			this.logger.warn('Failed to read a finished execution’s data for its job result', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	private async failJobsPastTimeout(): Promise<void> {
		const timedOut = await this.jobRepository.findRunningPastTimeout(new Date());
		for (const job of timedOut) {
			// Settle first so the timeout is recorded as the reason — an abort-first
			// order would race the aborted run's own settle write. Grab the handle
			// before settle drops it from the map.
			const controller = this.abortControllers.get(job.id);

			try {
				const settled = await this.settle(job.id, {
					status: 'failed',
					error: `Timed out after ${Math.round(SUB_AGENT_BACKGROUND_TIMEOUT_MS / 60_000)} minutes`,
				});
				if (settled) {
					this.logger.debug('Failed background job past its timeout', { jobId: job.id });
				}
			} catch (error) {
				this.logger.error('Failed to settle background job past its timeout', {
					jobId: job.id,
					error,
				});
			} finally {
				// The job is past its timeout either way — one failing settle write
				// must not leave this run alive or starve the rest of the batch.
				controller?.abort();
			}
		}
	}

	/**
	 * Fail running sub-agent jobs whose child execution already ended in
	 * `interrupted` or `error` while no live handle exists in this process —
	 * the spawning process died before settling. Early detection; the timeout
	 * would also catch these. Returns whether any row was settled.
	 */
	private async failOrphanedSubAgentJobs(jobs: AgentBackgroundJob[]): Promise<boolean> {
		const orphans = jobs.flatMap((job) =>
			job.kind === 'subagent' &&
			job.status === 'running' &&
			job.childThreadId !== null &&
			!this.abortControllers.has(job.id)
				? [{ job, childThreadId: job.childThreadId }]
				: [],
		);
		if (orphans.length === 0) return false;

		const statuses = await this.executionRepository.findLatestStatusesByThreadIds(
			orphans.map(({ childThreadId }) => childThreadId),
		);
		let settledAny = false;
		for (const { job, childThreadId } of orphans) {
			const childStatus = statuses.get(childThreadId);
			if (childStatus !== 'interrupted' && childStatus !== 'error') continue;
			const settled = await this.settle(job.id, {
				status: 'failed',
				error: `Sub-agent run ended with status "${childStatus}" and its result was not recovered`,
			});
			settledAny ||= settled;
		}
		return settledAny;
	}
}
