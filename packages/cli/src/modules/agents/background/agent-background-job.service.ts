import type { AgentBackgroundJobDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { createHash } from 'node:crypto';
import type { ExecutionStatus, IRunData, ITaskData, TerminalExecutionStatus } from 'n8n-workflow';
import { isTerminalExecutionStatus, WorkflowOperationError } from 'n8n-workflow';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import type { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import {
	AgentBackgroundJobRepository,
	type AgentBackgroundJobSettlement,
	type ExpectedBackgroundJobState,
	type BackgroundJobGroupItem,
	type NewSubAgentJob,
	type NewWorkflowJob,
} from '../repositories/agent-background-job.repository';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { decodeAgentSandboxHostMetadata } from '../agent-sandbox-principal';
import { isApprovalSuspendPayload } from '../integrations/agent-chat-suspension-cards';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import {
	BACKGROUND_APPROVAL_RUN_PREFIX,
	readBackgroundSubAgentState,
} from './sub-agent-background-state';

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
	| 'notifiedAt'
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
		private readonly updateBroadcaster: AgentExecutionUpdateBroadcaster,
		private readonly checkpointStorage: N8NCheckpointStorage,
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
		const running = await this.jobRepository.countActiveSubAgentsByParentThread(
			params.parentThreadId,
		);
		if (running >= MAX_RUNNING_JOBS_PER_THREAD) return { status: 'limit-reached' };

		await this.jobRepository.insertJob({
			...params,
			kind: 'subagent',
			timeoutAt: new Date(Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS),
		});
		this.updateBroadcaster.notifyBackgroundJobsUpdated(params.parentAgentId, params.parentThreadId);

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
		if (outcome.inserted) {
			this.updateBroadcaster.notifyBackgroundJobsUpdated(
				params.parentAgentId,
				params.parentThreadId,
			);
		}

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

	async settle(
		jobId: string,
		settlement: AgentBackgroundJobSettlement,
		expected?: ExpectedBackgroundJobState,
	): Promise<boolean> {
		const controller = this.abortControllers.get(jobId);
		let releaseController = true;
		try {
			const settled = await this.jobRepository.settleIfActive(jobId, settlement, expected);
			releaseController = settled;
			const job = await this.findJob(jobId);
			if (job && job.status !== 'running' && job.status !== 'suspended')
				await this.clearChildCheckpoint(job);
			if (!settled || !job) return settled;
			this.notifyJobUpdate(job);
			await this.requestWakeSafely(job.parentThreadId);
			return true;
		} finally {
			// Drop the handle even when the write throws — a leaked entry would
			// shield the still-running row from orphan reconciliation forever.
			if (controller && releaseController) this.unregisterAbortController(jobId, controller);
		}
	}

	async getApproval(job: AgentBackgroundJob) {
		if (
			job.kind !== 'subagent' ||
			!job.subAgentId ||
			!job.childThreadId ||
			(job.status !== 'running' && job.status !== 'suspended')
		)
			return undefined;
		const suspension = await this.checkpointStorage.findDelegatedSuspensionForThread(
			job.subAgentId,
			job.childThreadId,
		);
		if (!suspension) return undefined;
		const { checkpoint } = suspension;
		const metadata = readBackgroundSubAgentState(checkpoint);
		const scope = decodeAgentSandboxHostMetadata(checkpoint.persistence?.hostMetadata);
		if (
			!scope ||
			metadata?.jobId !== job.id ||
			metadata.resumeContext.agentId !== job.subAgentId ||
			checkpoint.persistence?.resourceId !== job.parentResourceId ||
			scope.principalHash !== job.parentPrincipalHash
		)
			return undefined;
		const pending = Object.values(checkpoint.pendingToolCalls).find(
			(call) => call.suspended && isApprovalSuspendPayload(call.suspendPayload),
		);
		if (!pending?.suspended || pending.runId !== suspension.runId) return undefined;
		// Bind responses to this checkpoint revision, including repeated gates on the same tool.
		const token = createHash('sha256')
			.update(suspension.serializedState)
			.update(suspension.updatedAt.toISOString())
			.digest('base64url')
			.slice(0, 22);
		return { ...suspension, metadata, pending, scope, token };
	}

	async suspend(jobId: string): Promise<boolean> {
		const job = await this.jobRepository.findById(jobId);
		if (!job) return false;
		if (job.status !== 'running') {
			if (job.status !== 'suspended') await this.clearChildCheckpoint(job);
			return false;
		}
		const approval = await this.getApproval(job);
		if (!approval) return false;
		if (
			!(await this.jobRepository.suspendIfRunning(
				jobId,
				approval.expiresAt,
				approval.runId,
				approval.serializedState,
			))
		) {
			const latest = await this.jobRepository.findById(jobId);
			if (latest && latest.status !== 'running' && latest.status !== 'suspended')
				await this.clearChildCheckpoint(latest);
			return false;
		}
		this.notifyJobUpdate(job);
		await this.requestWakeSafely(job.parentThreadId);
		return true;
	}

	async resume(jobId: string, timeoutAt: Date): Promise<boolean> {
		const resumed = await this.jobRepository.resumeIfSuspended(jobId, timeoutAt);
		if (resumed) await this.notifyJobUpdateById(jobId);
		return resumed;
	}

	private async clearChildCheckpoint(job: AgentBackgroundJob): Promise<void> {
		if (job.kind !== 'subagent' || !job.subAgentId || !job.childThreadId) return;
		try {
			await this.checkpointStorage.deleteDelegatedForThread(job.subAgentId, job.childThreadId);
		} catch (error) {
			// Reconciliation retries while the terminal job retains a checkpoint.
			this.logger.warn('Failed to clear background child checkpoints', { jobId: job.id, error });
		}
	}

	async markMailConsumed(parentThreadId: string, jobIds: string[]): Promise<number> {
		if (this.agentsConfig.backgroundTasksEnabled) {
			const { AgentWakeService } = await import('./agent-wake.service.js');
			// A tool can read these results during a wake. Wait for chat delivery before marking them.
			if (Container.get(AgentWakeService).isWakeActive(parentThreadId)) return 0;
		}
		return await this.consumeMail(parentThreadId, jobIds);
	}

	private async consumeMail(parentThreadId: string, jobIds: string[]): Promise<number> {
		const count = await this.jobRepository.markMailConsumed(parentThreadId, jobIds);
		// Clear pending cards when a foreground turn consumes results without a signal.
		if (count > 0 && jobIds[0]) await this.notifyJobUpdateById(jobIds[0]);
		return count;
	}

	registerAbortController(jobId: string, controller: AbortController): void {
		this.abortControllers.set(jobId, controller);
	}

	unregisterAbortController(jobId: string, controller: AbortController): void {
		if (this.abortControllers.get(jobId) === controller) this.abortControllers.delete(jobId);
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

		return jobs.map((job) => this.toJobView(job));
	}

	private toJobView(job: AgentBackgroundJob): BackgroundJobView {
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
			notifiedAt: job.notifiedAt,
			childExecutionId: job.childExecutionId,
		};
	}

	/**
	 * A group contains jobs whose execution periods overlap. A gap with no running jobs starts a new group.
	 * Return only the latest group while any job runs or has results that await consumption.
	 * The preview can show completed jobs alongside jobs that still run.
	 */
	async listCurrentGroupForThread(
		parentAgentId: string,
		parentThreadId: string,
	): Promise<Array<BackgroundJobGroupItem & Pick<AgentBackgroundJobDto, 'approval'>>> {
		const jobs = (await this.jobRepository.findGroupCandidates(parentAgentId, parentThreadId)).sort(
			(a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id),
		);
		let group: BackgroundJobGroupItem[] = [];
		let groupEndsAt = Number.NEGATIVE_INFINITY;

		for (const job of jobs) {
			const startedAt = job.createdAt.getTime();
			// A gap with no running jobs starts a new group.
			if (startedAt > groupEndsAt) group = [];
			group.push(job);
			groupEndsAt = Math.max(
				groupEndsAt,
				job.status === 'running' || job.status === 'suspended'
					? Number.POSITIVE_INFINITY
					: (job.settledAt?.getTime() ?? startedAt),
			);
		}

		// Keep finished jobs visible until the parent consumes their results.
		if (
			!group.some(
				(job) => job.status === 'running' || job.status === 'suspended' || !job.notifiedAt,
			)
		)
			return [];
		return await Promise.all(
			group.map(async (job) => {
				if (job.status !== 'suspended') return job;
				const row = await this.jobRepository.findById(job.id);
				const approval = row && (await this.getApproval(row));
				if (!approval) return job;
				return {
					...job,
					approval: {
						runId: `${BACKGROUND_APPROVAL_RUN_PREFIX}${job.id}`,
						toolCallId: approval.token,
						suspendPayload: approval.pending.suspendPayload,
					},
				};
			}),
		);
	}

	/**
	 * Cancel a job. A sub-agent row is claimed as cancelled first and its live
	 * run aborted second, so the aborted run's own settle write loses to the
	 * claim. Abort the local handle and relay to other mains, which may hold
	 * a resumed run. A workflow job stops its execution first instead; see
	 * `cancelWorkflowJob`.
	 */
	async cancel(
		parentThreadId: string,
		jobId: string,
	): Promise<'cancelled' | 'not-found' | 'already-settled'> {
		const [job] = await this.jobRepository.findByParentThread(parentThreadId, [jobId]);
		if (!job) return 'not-found';
		if (job.status !== 'running' && job.status !== 'suspended') return 'already-settled';

		if (job.kind === 'workflow') return await this.cancelWorkflowJob(job);

		const claimed = await this.jobRepository.settleIfActive(jobId, { status: 'cancelled' });
		if (!claimed) return 'already-settled';
		this.updateBroadcaster.notifyBackgroundJobsUpdated(job.parentAgentId, job.parentThreadId);

		const controller = this.abortControllers.get(jobId);
		if (controller) {
			controller.abort();
			this.abortControllers.delete(jobId);
		}
		// publishCommand is a no-op outside queue mode.
		// The row is already claimed, so a relay failure must not become a tool error.
		try {
			await this.publisher.publishCommand({
				command: 'cancel-agent-background-job',
				payload: { jobId },
			});
		} catch (error) {
			this.logger.warn('Failed to relay background job cancellation', { jobId, error });
		}

		await this.clearChildCheckpoint(job);
		await this.consumeCancelledMail(parentThreadId, jobId);
		return 'cancelled';
	}

	async cancelForParent(
		parentAgentId: string,
		parentThreadId: string,
		parentResourceId: string,
	): Promise<void> {
		const jobs = await this.jobRepository.findByParentThread(parentThreadId);
		for (const job of jobs) {
			if (
				job.kind === 'subagent' &&
				job.parentAgentId === parentAgentId &&
				job.parentResourceId === parentResourceId &&
				(job.status === 'running' || job.status === 'suspended')
			) {
				await this.cancel(parentThreadId, job.id);
			}
		}
	}

	private async findJob(jobId: string): Promise<AgentBackgroundJob | null> {
		try {
			return await this.jobRepository.findById(jobId);
		} catch (error) {
			this.logger.warn('Failed to resolve background job update', { jobId, error });
			return null;
		}
	}

	private notifyJobUpdate(job: AgentBackgroundJob): void {
		try {
			this.updateBroadcaster.notifyBackgroundJobsUpdated(job.parentAgentId, job.parentThreadId);
		} catch (error) {
			this.logger.warn('Failed to notify background job update', { jobId: job.id, error });
		}
	}

	private async notifyJobUpdateById(jobId: string): Promise<void> {
		const job = await this.findJob(jobId);
		if (job) this.notifyJobUpdate(job);
	}

	private async requestWakeSafely(parentThreadId: string): Promise<void> {
		if (!this.agentsConfig.backgroundTasksEnabled) return;

		try {
			const { AgentWakeService } = await import('./agent-wake.service.js');
			await Container.get(AgentWakeService).requestWake(parentThreadId);
		} catch (error) {
			this.logger.warn('Failed to request a parent wake for a settled background job', {
				parentThreadId,
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
		for (const job of await this.jobRepository.findSettledSubAgentsWithCheckpoints()) {
			await this.clearChildCheckpoint(job);
		}
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
		if (!(await this.stopWorkflowJobExecution(job))) return 'already-settled';

		// The stopped execution's settle hook may have written `cancelled` first;
		// either way the job is cancelled.
		const settled = await this.jobRepository.settleIfActive(job.id, { status: 'cancelled' });
		if (settled) {
			this.updateBroadcaster.notifyBackgroundJobsUpdated(job.parentAgentId, job.parentThreadId);
		}
		await this.consumeCancelledMail(job.parentThreadId, job.id);
		return 'cancelled';
	}

	/**
	 * Mark the cancellation result as delivered after the child stops.
	 * If this write fails, a later wake can repeat the result.
	 */
	private async consumeCancelledMail(parentThreadId: string, jobId: string): Promise<void> {
		try {
			await this.consumeMail(parentThreadId, [jobId]);
		} catch (error) {
			this.logger.warn('Failed to mark the cancelled job result as delivered', { jobId, error });
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
			settledAny =
				(await this.settleFinishedWorkflowJob(job, statuses.get(job.childExecutionId))) ||
				settledAny;
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
		const timedOut = await this.jobRepository.findActivePastTimeout(new Date());
		for (const job of timedOut) {
			if (job.status !== 'running' && job.status !== 'suspended') continue;
			if (job.status === 'running' && (await this.suspend(job.id))) continue;
			// Settle first so the timeout is recorded as the reason — an abort-first
			// order would race the aborted run's own settle write. Grab the handle
			// before settle drops it from the map.
			const controller = job.status === 'running' ? this.abortControllers.get(job.id) : undefined;
			let abort = true;

			try {
				const settled = await this.settle(
					job.id,
					{
						status: 'failed',
						error:
							job.status === 'suspended'
								? 'Approval expired'
								: `Timed out after ${Math.round(SUB_AGENT_BACKGROUND_TIMEOUT_MS / 60_000)} minutes`,
					},
					{ status: job.status, timeoutAt: job.timeoutAt },
				);
				abort = settled;
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
				if (abort) controller?.abort();
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
			if (childStatus !== 'running' && (await this.suspend(job.id))) {
				settledAny = true;
				continue;
			}
			if (childStatus !== 'interrupted' && childStatus !== 'error') continue;
			const settled = await this.settle(
				job.id,
				{
					status: 'failed',
					error: `Sub-agent run ended with status "${childStatus}" and its result was not recovered`,
				},
				{ status: 'running', timeoutAt: job.timeoutAt },
			);
			settledAny ||= settled;
		}
		return settledAny;
	}

	private async stopWorkflowJobExecution(job: AgentBackgroundJob): Promise<boolean> {
		if (job.childExecutionId === null || job.workflowId === null) return true;
		// Lazy: ExecutionService is a heavy dependency this service otherwise
		// never needs — workers load this class for the settle path alone.
		const { ExecutionService } = await import('@/executions/execution.service.js');
		const { MissingExecutionStopError } = await import('@/errors/missing-execution-stop.error.js');
		try {
			await Container.get(ExecutionService).stop(job.childExecutionId, [job.workflowId]);
		} catch (error) {
			if (error instanceof MissingExecutionStopError || error instanceof WorkflowOperationError) {
				this.logger.debug('Workflow job execution was already beyond stopping', {
					jobId: job.id,
					executionId: job.childExecutionId,
				});
				return false;
			}

			this.logger.error('Failed to stop a workflow job execution — it may still be running', {
				jobId: job.id,
				executionId: job.childExecutionId,
				error: error instanceof Error ? error.message : String(error),
			});

			throw error;
		}
		return true;
	}

	private async settleFinishedWorkflowJob(
		job: AgentBackgroundJob & { childExecutionId: string },
		executionStatus: ExecutionStatus | undefined,
	): Promise<boolean> {
		const executionId = job.childExecutionId;
		try {
			if (executionStatus === undefined) {
				return await this.settle(job.id, {
					status: 'failed',
					error: EXECUTION_OUTCOME_UNKNOWN_ERROR,
				});
			}
			if (!isTerminalExecutionStatus(executionStatus)) return false;
			const status = settlementStatusForExecution(executionStatus);
			return await this.settle(job.id, {
				status,
				result: status === 'completed' ? await this.loadExecutionResult(executionId) : null,
				error: executionStatus === 'success' ? null : `Execution ${executionStatus}`,
			});
		} catch (error) {
			this.logger.error('Failed to reconcile workflow background job', {
				jobId: job.id,
				executionId,
				error,
			});
			return false;
		}
	}
}
