import type { ApprovalSuspendPayload } from '@n8n/agents';
import { Logger } from '@n8n/backend-common';
import { Time } from '@n8n/constants';
import { OnPubSubEvent } from '@n8n/decorators';
import { Service } from '@n8n/di';

import { Publisher } from '@/scaling/pubsub/publisher.service';

import type {
	AgentBackgroundJob,
	AgentBackgroundJobSuspension,
} from '../entities/agent-background-job.entity';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import {
	AgentBackgroundJobRepository,
	type AgentBackgroundJobSettlement,
	type NewSubAgentJob,
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
	'id' | 'kind' | 'title' | 'status' | 'result' | 'error' | 'createdAt' | 'timeoutAt' | 'settledAt'
> & { suspendPayload: ApprovalSuspendPayload | null };

function toBackgroundJobView(job: AgentBackgroundJob): BackgroundJobView {
	return {
		id: job.id,
		kind: job.kind,
		title: job.title,
		status: job.status,
		result: job.result,
		error: job.error,
		createdAt: job.createdAt,
		timeoutAt: job.timeoutAt,
		settledAt: job.settledAt,
		suspendPayload: job.suspension?.suspendPayload ?? null,
	};
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
		private readonly publisher: Publisher,
		private readonly checkpointStorage: N8NCheckpointStorage,
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

		const reconciled = await this.failOrphanedSubAgentJobs(jobs);
		if (reconciled) jobs = await this.jobRepository.findByParentThread(parentThreadId, ids);

		return jobs.map(toBackgroundJobView);
	}

	async park(jobId: string, suspension: AgentBackgroundJobSuspension): Promise<boolean> {
		try {
			const parked = await this.jobRepository.parkIfRunning(jobId, suspension);
			if (!parked) await this.discardChildCheckpoint(jobId, suspension);
			return parked;
		} finally {
			this.abortControllers.delete(jobId);
		}
	}

	async findJob(jobId: string): Promise<AgentBackgroundJob | null> {
		return await this.jobRepository.findById(jobId);
	}

	async claimSuspendedForResume(jobId: string): Promise<boolean> {
		return await this.jobRepository.claimSuspended(
			jobId,
			new Date(Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS),
		);
	}

	async settleSuspended(
		jobId: string,
		settlement: AgentBackgroundJobSettlement,
		checkpoint: { runId: string; agentId: string } | undefined,
	): Promise<boolean> {
		const settled = await this.settle(jobId, settlement);
		if (checkpoint) await this.discardCheckpoint(jobId, checkpoint);
		return settled;
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
			if (job.suspension) await this.discardChildCheckpoint(job.id, job.suspension);
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
		await this.failExpiredSuspensions();
		await this.failOrphanedSubAgentJobs(await this.jobRepository.findRunningJobs('subagent'));

		await this.jobRepository.deleteSettledBefore(new Date(Date.now() - SETTLED_JOB_RETENTION_MS));
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
			job.suspension === null &&
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

	private async failExpiredSuspensions(): Promise<void> {
		for (const job of await this.jobRepository.findParkedJobs()) {
			if (!job.suspension) continue;
			try {
				const checkpoint = await this.checkpointStorage.getStatus(
					job.suspension.childRunId,
					job.suspension.childAgentId,
				);
				if (checkpoint.status === 'active') continue;
				await this.jobRepository.settleSuspendedIfRunning(job.id, {
					status: 'failed',
					error: 'Sub-agent request for human input expired before anyone answered',
				});
			} catch (error) {
				this.logger.error('Failed to reconcile a background sub-agent suspension', {
					jobId: job.id,
					error,
				});
			}
		}
	}

	private async discardChildCheckpoint(
		jobId: string,
		suspension: AgentBackgroundJobSuspension,
	): Promise<void> {
		await this.discardCheckpoint(jobId, {
			runId: suspension.childRunId,
			agentId: suspension.childAgentId,
		});
	}

	private async discardCheckpoint(
		jobId: string,
		checkpoint: { runId: string; agentId: string },
	): Promise<void> {
		try {
			await this.checkpointStorage.delete(checkpoint.runId, checkpoint.agentId);
		} catch (error) {
			this.logger.warn('Failed to discard the checkpoint of a background sub-agent job', {
				jobId,
				error,
			});
		}
	}
}
