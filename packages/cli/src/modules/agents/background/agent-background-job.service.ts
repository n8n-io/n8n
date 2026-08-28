import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type { TerminalExecutionStatus } from 'n8n-workflow';
import { isTerminalExecutionStatus } from 'n8n-workflow';

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

/** Cap on the result text persisted on a workflow job row at settle. */
export const WORKFLOW_JOB_RESULT_MAX_CHARS = 8000;

/** Job settlement status a finished workflow execution maps to. */
export function settlementStatusForExecution(
	status: TerminalExecutionStatus,
): 'completed' | 'failed' | 'cancelled' {
	if (status === 'success') return 'completed';
	if (status === 'canceled') return 'cancelled';
	return 'failed';
}

/**
 * Serialize a workflow's result data for the job row, bounded so a large
 * output cannot bloat the table — the execution itself keeps the full data.
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
 * status checks — nothing the check tool depends on lives in memory. The
 * in-process abort map only carries live cancellation handles.
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
	) {
		this.logger = this.logger.scoped('agents');
	}

	/**
	 * Register a sub-agent job. The receipt follows the spawn contract:
	 * `limit-reached` when the thread already has the maximum running jobs,
	 * else `started`.
	 */
	async registerSubAgentJob(
		params: Omit<NewSubAgentJob, 'kind' | 'timeoutAt'>,
	): Promise<BackgroundJobReceipt> {
		// ponytail: count-then-insert can briefly admit one job over the cap under
		// concurrent spawns; the limit is advisory. Wrap in a transaction if it
		// ever needs to be exact.
		const running = await this.jobRepository.countRunningByParentThread(params.parentThreadId);
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
	 * The execution is already running either way, so there is no cap check and
	 * no timeout — its own lifecycle governs. The schema allows exactly one job
	 * per execution: a concurrent or replayed registration converges on the job
	 * that won the insert, so the receipt always names the row actually tracking
	 * the execution.
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
			return await this.jobRepository.settleIfRunning(jobId, settlement);
		} finally {
			// Drop the handle even when the write throws — a leaked entry would
			// shield the still-running row from orphan reconciliation forever.
			this.abortControllers.delete(jobId);
		}
	}

	registerAbortController(jobId: string, controller: AbortController): void {
		this.abortControllers.set(jobId, controller);
	}

	/**
	 * Jobs of the given thread, with running rows reconciled first so the model
	 * gets a truthful answer instead of a forever-running job when the settle
	 * never ran (crash, restart).
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
	 * Claim the row as cancelled, then abort the live run. When this process
	 * holds the handle the abort is direct; otherwise the spawning main is
	 * reached via pubsub. The row is claimed first either way, so the aborted
	 * run's own settle write loses to the claim.
	 */
	async cancel(
		parentThreadId: string,
		jobId: string,
	): Promise<'cancelled' | 'not-found' | 'already-settled'> {
		const [job] = await this.jobRepository.findByParentThread(parentThreadId, [jobId]);
		if (!job) return 'not-found';

		const claimed = await this.jobRepository.settleIfRunning(jobId, { status: 'cancelled' });
		if (!claimed) return 'already-settled';

		if (job.kind === 'workflow') {
			await this.stopWorkflowExecution(job);
			return 'cancelled';
		}

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
		return 'cancelled';
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
		await this.settleFinishedWorkflowJobs(await this.jobRepository.findRunningJobs('workflow'));

		await this.jobRepository.deleteSettledBefore(new Date(Date.now() - SETTLED_JOB_RETENTION_MS));
	}

	/**
	 * Cross-process stop of a cancelled workflow job's execution. The job row is
	 * already claimed, so a stop that finds the execution finished (or gone) is
	 * not an error worth surfacing to the model.
	 */
	private async stopWorkflowExecution(job: AgentBackgroundJob): Promise<void> {
		if (job.childExecutionId === null || job.workflowId === null) return;

		// Lazy: ExecutionService is a heavy dependency this service otherwise
		// never needs — workers load this class for the settle path alone.
		const { ExecutionService } = await import('@/executions/execution.service.js');
		try {
			await Container.get(ExecutionService).stop(job.childExecutionId, [job.workflowId]);
		} catch (error) {
			this.logger.debug('Stopping a cancelled workflow job execution did not succeed', {
				jobId: job.id,
				executionId: job.childExecutionId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Settle running workflow jobs whose execution already reached a terminal
	 * state — the settle hook never ran (crash) or lost the registration race.
	 * The result is left empty here; the lifecycle hook is the path that
	 * captures output. An execution that no longer exists (pruned, deleted)
	 * fails the job. Returns whether any row was settled.
	 */
	private async settleFinishedWorkflowJobs(jobs: AgentBackgroundJob[]): Promise<boolean> {
		const candidates = jobs.filter(
			(job) => job.kind === 'workflow' && job.status === 'running' && job.childExecutionId !== null,
		);

		let settledAny = false;
		for (const job of candidates) {
			const executionId = job.childExecutionId;
			if (executionId === null) continue;
			try {
				const execution = await this.executionPersistence.findSingleExecution(executionId);
				if (!execution) {
					settledAny =
						(await this.settle(job.id, {
							status: 'failed',
							error: 'The workflow execution no longer exists',
						})) || settledAny;
					continue;
				}
				if (!isTerminalExecutionStatus(execution.status)) continue;

				settledAny =
					(await this.settle(job.id, {
						status: settlementStatusForExecution(execution.status),
						error: execution.status === 'success' ? null : `Execution ${execution.status}`,
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
