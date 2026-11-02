import type { AgentBackgroundJobDto } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import type {
	ExecutionStatus,
	INodeExecutionData,
	IRunData,
	ITaskData,
	TerminalExecutionStatus,
} from 'n8n-workflow';
import { isTerminalExecutionStatus, WorkflowOperationError } from 'n8n-workflow';
import { createHash } from 'node:crypto';
import { v7 as uuidv7 } from 'uuid';

import { ExecutionPersistence } from '@/executions/execution-persistence';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import { AgentExecutionUpdateBroadcaster } from '../agent-execution-update-broadcaster';
import { decodeAgentSandboxHostMetadata } from '../agent-sandbox-principal';
import { AgentFileBridge } from '../agent-file-bridge.service';
import type { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import { isApprovalSuspendPayload } from '../integrations/agent-chat-suspension-cards';
import { N8NCheckpointStorage } from '../integrations/n8n-checkpoint-storage';
import {
	AgentBackgroundJobRepository,
	type AgentBackgroundJobSettlement,
	type ExpectedBackgroundJobState,
	type BackgroundJobGroupItem,
	type NewSubAgentJob,
	type NewWorkflowJob,
} from '../repositories/agent-background-job.repository';
import { AgentExecutionThreadRepository } from '../repositories/agent-execution-thread.repository';
import { AgentExecutionRepository } from '../repositories/agent-execution.repository';
import { AgentMessageRepository } from '../repositories/agent-message.repository';
import { AgentPlanRepository } from '../repositories/agent-plan.repository';
import { formatPauseHandoff, REPLACED_PAUSE_GROUP_NOTICE } from './background-job-messages';
import {
	BACKGROUND_APPROVAL_RUN_PREFIX,
	readBackgroundSubAgentState,
} from './sub-agent-background-state';

/** Bounds live sub-agent runs per thread. Workflow jobs are parked executions and are exempt. */
export const MAX_RUNNING_JOBS_PER_THREAD = 5;
export const SUB_AGENT_BACKGROUND_TIMEOUT_MS = 30 * Time.minutes.toMilliseconds;
export const SETTLED_JOB_RETENTION_MS = 30 * Time.days.toMilliseconds;
export const EXPIRED_BACKGROUND_CHECKPOINT_ERROR =
	'This background task checkpoint has expired and cannot be resumed';

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
	| 'files'
	| 'skippedFiles'
	| 'createdAt'
	| 'timeoutAt'
	| 'settledAt'
	| 'notifiedAt'
	| 'childExecutionId'
	| 'pauseRequestId'
	| 'planId'
	| 'planTaskId'
>;

type JobOutputFiles = Required<Pick<AgentBackgroundJobSettlement, 'files' | 'skippedFiles'>>;

const NO_OUTPUT_FILES: JobOutputFiles = { files: null, skippedFiles: null };

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

/** Extract the items produced by the last run of a node. */
function outputItemsFromNodeRuns(nodeRuns: ITaskData[]): INodeExecutionData[] {
	const lastRun = nodeRuns[nodeRuns.length - 1];
	if (!lastRun?.data?.main) return [];
	return lastRun.data.main.flatMap((items) => items ?? []);
}

/** Build a map from node name to output items. Items keep their binary data. */
export function collectResultItems(
	runData: IRunData,
	allOutputs: boolean,
): Record<string, INodeExecutionData[]> {
	const nodeNames = allOutputs ? Object.keys(runData) : Object.keys(runData).slice(-1);
	const resultItems: Record<string, INodeExecutionData[]> = {};
	for (const nodeName of nodeNames) {
		const outputItems = outputItemsFromNodeRuns(runData[nodeName]);
		if (outputItems.length > 0) resultItems[nodeName] = outputItems;
	}
	return resultItems;
}

/** Map each node's output items to their JSON. */
export function toResultData(
	resultItems: Record<string, INodeExecutionData[]>,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(resultItems).map(([nodeName, items]) => [
			nodeName,
			items.map((item) => item.json),
		]),
	);
}

/** Build the resultData map from an execution's runData. */
export function collectResultData(runData: IRunData, allOutputs: boolean): Record<string, unknown> {
	return toResultData(collectResultItems(runData, allOutputs));
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

function latestStopGroup(jobs: AgentBackgroundJob[]): AgentBackgroundJob[] {
	// UUIDv7 IDs sort by creation time. Index 14 holds the UUID version.
	// Prefer v7 IDs, then sort descending to select the latest stop group.
	const latestId = jobs
		.flatMap((job) => (job.pauseRequestId ? [job.pauseRequestId] : []))
		.sort((a, b) => Number(b[14] === '7') - Number(a[14] === '7') || b.localeCompare(a))[0];
	return latestId ? jobs.filter((job) => job.pauseRequestId === latestId) : [];
}

/**
 * Registry of durable background jobs dispatched by top-level agents. The job
 * row is the receipt handed to the model and the single source of truth for
 * status checks.
 */
@Service()
export class AgentBackgroundJobService {
	private readonly abortControllers = new Map<string, AbortController>();
	private readonly pendingSubAgentJobs = new Set<{
		params: Pick<NewSubAgentJob, 'parentAgentId' | 'parentThreadId' | 'parentResourceId'>;
		cancelRequested: boolean;
	}>();

	constructor(
		private readonly threadRepository: AgentExecutionThreadRepository,
		private readonly jobRepository: AgentBackgroundJobRepository,
		private readonly executionRepository: AgentExecutionRepository,
		private readonly executionPersistence: ExecutionPersistence,
		private readonly publisher: Publisher,
		private readonly logger: Logger,
		private readonly agentsConfig: AgentsConfig,
		private readonly updateBroadcaster: AgentExecutionUpdateBroadcaster,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly messageRepository: AgentMessageRepository,
		private readonly plans: AgentPlanRepository,
		private readonly fileBridge: AgentFileBridge,
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
		const registration = { params, cancelRequested: false };
		this.pendingSubAgentJobs.add(registration);
		try {
			const inserted = await this.jobRepository.insertSubAgentJobIfCapacity(
				{
					...params,
					kind: 'subagent',
					timeoutAt: new Date(Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS),
				},
				MAX_RUNNING_JOBS_PER_THREAD,
			);
			if (!inserted) return { status: 'limit-reached' };
			if (registration.cancelRequested) await this.cancel(params.parentThreadId, params.id);
			this.updateBroadcaster.notifyBackgroundJobsUpdated(
				params.parentAgentId,
				params.parentThreadId,
			);

			return { status: 'started', jobId: params.id };
		} finally {
			this.pendingSubAgentJobs.delete(registration);
		}
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
		runData?: IRunData,
	): Promise<boolean> {
		const job = await this.jobRepository.findRunningWorkflowJobByExecutionId(executionId);
		if (!job) return false;

		if (job.pauseRequestId && runData) {
			settlement = {
				...settlement,
				result: serializeWorkflowJobResult(collectResultData(runData, true)),
			};
		}
		let storedFiles: JobOutputFiles['files'] = null;
		if (settlement.status === 'completed' && runData && settlement.files === undefined) {
			const output = await this.storeOutputFiles(job, runData);
			storedFiles = output.files;
			settlement = { ...settlement, ...output };
		}
		const settled = await this.settle(job.id, settlement);
		if (!settled) await this.deleteUnusedFiles(job.id, storedFiles);
		return settled;
	}

	/**
	 * Store the binary output as files of the parent thread. Use the same nodes
	 * as the job result: all nodes for a job that a stop request paused, else the last node. The job keeps the file list,
	 * so the wake message and the background jobs check can show the file IDs.
	 * The job also keeps the files that were too large to store, so the model
	 * knows that they are missing. Each list is null when it is empty.
	 * A storage error must not block the settle, so it logs and returns no files.
	 */
	async storeOutputFiles(
		job: Pick<AgentBackgroundJob, 'id' | 'parentAgentId' | 'parentThreadId' | 'pauseRequestId'>,
		runData: IRunData,
	): Promise<JobOutputFiles> {
		const items = Object.values(collectResultItems(runData, Boolean(job.pauseRequestId))).flat();
		if (!items.some((item) => item.binary)) return NO_OUTPUT_FILES;
		try {
			const projectId = await this.threadRepository.findProjectId(job.parentThreadId);
			if (!projectId) return NO_OUTPUT_FILES;
			const { files, skippedFiles } = await this.fileBridge.adoptFromItems(items, {
				agentId: job.parentAgentId,
				projectId,
				threadId: job.parentThreadId,
			});
			return {
				files: files.length > 0 ? files : null,
				skippedFiles: skippedFiles.length > 0 ? skippedFiles : null,
			};
		} catch (error) {
			this.logger.warn('Failed to store background job output files', { jobId: job.id, error });
			return NO_OUTPUT_FILES;
		}
	}

	/**
	 * Another writer settled the job first, so the job does not refer to these files.
	 * The live callback and reconciliation can both store the same output.
	 */
	private async deleteUnusedFiles(jobId: string, files: JobOutputFiles['files']): Promise<void> {
		if (!files) return;
		try {
			await this.fileBridge.deleteFiles(files.map(({ fileId }) => fileId));
		} catch (error) {
			this.logger.warn('Failed to delete unused background job output files', { jobId, error });
		}
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

			if (job && job.status !== 'running' && job.status !== 'suspended' && job.status !== 'paused')
				await this.clearChildCheckpoint(job);

			if (!settled || !job) {
				if (job?.status === 'cancelled' && settlement.status === 'completed' && settlement.result) {
					await this.jobRepository.preserveLateCompletedResult(jobId, settlement.result);
					this.notifyJobUpdate(job);
				}

				return settled;
			}

			if (job.pauseRequestId) await this.retainLatestStopGroup(job);

			this.notifyJobUpdate(job);
			await this.requestWakeSafely(job.parentThreadId);

			return true;
		} finally {
			// Drop the handle even when the write throws — a leaked entry would
			// shield the still-running row from orphan reconciliation forever.
			if (controller && releaseController) this.unregisterAbortController(jobId, controller);
		}
	}

	async getCheckpoint(job: AgentBackgroundJob) {
		if (
			job.kind !== 'subagent' ||
			!job.subAgentId ||
			!job.childThreadId ||
			!['running', 'suspended', 'paused'].includes(job.status)
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
		return { ...suspension, metadata, scope };
	}

	async getApproval(job: AgentBackgroundJob) {
		const suspension = await this.getCheckpoint(job);
		if (!suspension) return undefined;
		const { checkpoint } = suspension;
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
		return { ...suspension, pending, token };
	}

	async requestPause(
		parentAgentId: string,
		parentThreadId: string,
		parentResourceId: string,
		pauseRequestId = uuidv7(),
		jobIds?: string[],
	): Promise<void> {
		await this.pruneExpiredPausedJobs(parentThreadId);

		if (jobIds) {
			await this.jobRepository.requestPauseForCapturedJobs(
				parentAgentId,
				parentThreadId,
				parentResourceId,
				pauseRequestId,
				jobIds,
			);
		} else {
			await this.jobRepository.requestPauseForActiveJobs(
				parentAgentId,
				parentThreadId,
				parentResourceId,
				pauseRequestId,
			);
		}

		this.updateBroadcaster.notifyBackgroundJobsUpdated(parentAgentId, parentThreadId);

		const jobs = await this.jobRepository.findByParentThread(parentThreadId);
		const selected = jobs.filter(
			(job) =>
				(jobIds === undefined || jobIds.includes(job.id)) &&
				job.parentAgentId === parentAgentId &&
				job.parentResourceId === parentResourceId &&
				job.pauseRequestId &&
				!job.notifiedAt,
		);
		const results = await Promise.allSettled(
			selected.map(async (job) => {
				if (job.kind === 'workflow' && job.status === 'running') await this.cancelWorkflowJob(job);
				else if (job.kind === 'subagent' && job.status === 'suspended') await this.pause(job.id);
			}),
		);
		await this.requestWakeSafely(parentThreadId);
		const failure = results.find((result) => result.status === 'rejected');
		if (failure) throw failure.reason;
	}

	async shouldPause(jobId: string): Promise<boolean> {
		const job = await this.jobRepository.findById(jobId);
		return Boolean(job?.pauseRequestId);
	}

	async preparePausedResume(
		parentAgentId: string,
		parentThreadId: string,
		parentResourceId: string,
		executionId: string,
		selection?: { planId: string; taskIds?: string[] },
	) {
		const execution = await this.executionRepository.findExecution(executionId);

		if (execution?.threadId !== parentThreadId || execution.status !== 'running') {
			return { status: 'unavailable' as const, jobs: [] };
		}

		const inputs =
			(await this.messageRepository.findExecutionInputs([executionId])).get(executionId) ?? [];
		const userInput = inputs
			.filter(
				(message) =>
					message.role === 'user' &&
					!message.origin?.hidden &&
					message.threadId === parentThreadId &&
					message.resourceId === parentResourceId,
			)
			.at(-1);

		if (!userInput) return { status: 'unavailable' as const, jobs: [] };

		await this.pruneExpiredPausedJobs(parentThreadId);
		await this.releaseStaleResumeReservations(
			parentAgentId,
			parentThreadId,
			parentResourceId,
			execution.startedAt ?? execution.createdAt,
		);

		const planStop = await this.threadRepository.findTaskStop(parentThreadId);
		const planSelection = selection ?? (planStop?.planId ? { planId: planStop.planId } : undefined);

		if (planSelection) {
			const selected = await this.plans.selectStoppedTasks(
				parentThreadId,
				planSelection.planId,
				planSelection.taskIds,
			);

			if (selected.status !== 'selected') return { status: selected.status, jobs: [] };

			if (
				selected.jobs.some(
					(job) => job.status === 'running' || job.status === 'suspended' || !job.notifiedAt,
				)
			)
				return { status: 'stopping' as const, jobs: [] };

			const paused = selected.jobs.filter(
				(job) => job.kind === 'subagent' && job.status === 'paused',
			);
			const timeoutAt = new Date(Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS);
			const admission = await this.jobRepository.reservePlanJobs(
				parentThreadId,
				selected.stopId,
				paused.map((job) => job.id),
				timeoutAt,
				MAX_RUNNING_JOBS_PER_THREAD,
			);

			if (admission !== 'reserved')
				return {
					status:
						admission === 'limit-reached' ? ('limit-reached' as const) : ('stopping' as const),
					jobs: [],
				};

			return {
				status: 'ready' as const,
				jobs: paused,
				timeoutAt,
				selection: { planId: selected.planId, stopId: selected.stopId, taskIds: selected.taskIds },
				blocked: selected.blocked,
				failed: selected.jobs
					.filter((job) => job.status === 'failed')
					.map((job) => ({ jobId: job.id, planTaskId: job.planTaskId, error: job.error })),
				workflowsToRestart: selected.jobs
					.filter((job) => job.kind === 'workflow' && job.status === 'cancelled')
					.map((job) => ({
						jobId: job.id,
						title: job.title,
						workflowId: job.workflowId,
						previousExecutionId: job.childExecutionId,
						planTask:
							job.planId && job.planTaskId
								? { planId: job.planId, planTaskId: job.planTaskId }
								: undefined,
					})),
			};
		}

		const newPlanRequest = Boolean(
			planStop?.pause.reportedAt && !planStop.generation.executionIds.includes(executionId),
		);
		const jobs = (await this.jobRepository.findByParentThread(parentThreadId)).filter(
			(job) =>
				job.parentAgentId === parentAgentId &&
				job.parentResourceId === parentResourceId &&
				job.pauseRequestId,
		);

		if (
			jobs.some(
				(job) =>
					job.status === 'running' ||
					job.status === 'suspended' ||
					!job.notifiedAt ||
					(!newPlanRequest && userInput.createdAt <= job.notifiedAt),
			)
		) {
			return { status: 'stopping' as const, jobs: [] };
		}

		const stoppedGroup = latestStopGroup(jobs);
		const workflowsToRestart = stoppedGroup
			.filter((job) => job.kind === 'workflow' && job.status === 'cancelled')
			.map((job) => ({
				jobId: job.id,
				title: job.title,
				workflowId: job.workflowId,
				previousExecutionId: job.childExecutionId,
			}));
		const paused = stoppedGroup.filter((job) => job.kind === 'subagent' && job.status === 'paused');
		const latestId = paused[0]?.pauseRequestId;
		const timeoutAt = new Date(Date.now() + SUB_AGENT_BACKGROUND_TIMEOUT_MS);

		if (!latestId) {
			if (
				workflowsToRestart.length === 0 &&
				stoppedGroup.some((job) => job.error === EXPIRED_BACKGROUND_CHECKPOINT_ERROR)
			)
				return { status: 'expired' as const, jobs: [] };

			return { status: 'ready' as const, jobs: [], timeoutAt, workflowsToRestart };
		}

		const admission = await this.jobRepository.reservePausedGroup(
			parentThreadId,
			latestId,
			paused.map((job) => job.id),
			timeoutAt,
			MAX_RUNNING_JOBS_PER_THREAD,
		);

		if (admission === 'limit-reached') return { status: 'limit-reached' as const, jobs: [] };

		if (admission !== 'reserved') return { status: 'stopping' as const, jobs: [] };

		return { status: 'ready' as const, jobs: paused, timeoutAt, workflowsToRestart };
	}

	async finishPlanResume(
		parentAgentId: string,
		threadId: string,
		selection: { planId: string; stopId: string; taskIds: string[] },
	) {
		await this.plans.releaseStoppedTasks(
			threadId,
			selection.planId,
			selection.stopId,
			selection.taskIds,
		);

		this.updateBroadcaster.notifyBackgroundJobsUpdated(parentAgentId, threadId);
	}

	private async releaseStaleResumeReservations(
		parentAgentId: string,
		parentThreadId: string,
		parentResourceId: string,
		executionStartedAt: Date,
	): Promise<void> {
		const requested = await this.jobRepository.findRequestedPauses(parentThreadId);
		let restored = false;
		for (const job of requested) {
			if (
				job.parentAgentId === parentAgentId &&
				job.parentResourceId === parentResourceId &&
				job.status === 'suspended' &&
				job.pauseRequestId &&
				job.notifiedAt &&
				job.timeoutAt &&
				job.updatedAt < executionStartedAt
			)
				restored = (await this.releaseResumeReservations([job], job.timeoutAt)) || restored;
		}
		if (restored) await this.pruneExpiredPausedJobs(parentThreadId);
	}

	async releaseResumeReservations(jobs: AgentBackgroundJob[], timeoutAt: Date): Promise<boolean> {
		let released = false;
		for (const job of jobs) {
			if (!job.pauseRequestId) continue;
			try {
				if (await this.jobRepository.releasePausedResume(job.id, job.pauseRequestId, timeoutAt)) {
					this.notifyJobUpdate(job);
					released = true;
				}
			} catch (error) {
				this.logger.warn('Failed to release background resume capacity', { jobId: job.id, error });
			}
		}
		return released;
	}

	/** Fails paused jobs whose checkpoint expired. Stops before the next job once `signal` aborts. */
	async pruneExpiredPausedJobs(parentThreadId?: string, signal?: AbortSignal): Promise<void> {
		const cutoff = new Date(
			Date.now() - this.agentsConfig.checkpointTtlSeconds * Time.seconds.toMilliseconds,
		);
		for (const job of await this.jobRepository.findPausedWithoutCheckpoint(
			cutoff,
			parentThreadId,
		)) {
			if (signal?.aborted) {
				return;
			}
			await this.settle(
				job.id,
				{ status: 'failed', error: EXPIRED_BACKGROUND_CHECKPOINT_ERROR },
				{ status: 'paused', pauseRequestId: job.pauseRequestId },
			);
		}
	}

	async retainLatestStopGroup(job: AgentBackgroundJob): Promise<void> {
		const replaced = await this.jobRepository.retainLatestStopGroup(
			job.parentAgentId,
			job.parentThreadId,
			job.parentResourceId,
			REPLACED_PAUSE_GROUP_NOTICE,
		);
		for (const previous of replaced) await this.clearChildCheckpoint(previous);
	}

	async notifyResumed(jobId: string): Promise<void> {
		const job = await this.findJob(jobId);
		if (!job) return;
		this.notifyJobUpdate(job);
		if (job.status === 'suspended') await this.requestWakeSafely(job.parentThreadId);
	}

	async pause(jobId: string): Promise<boolean> {
		const job = await this.jobRepository.findById(jobId);
		if (
			!job?.pauseRequestId ||
			job.notifiedAt ||
			(job.status !== 'running' && job.status !== 'suspended')
		)
			return false;
		let suspension = await this.getCheckpoint(job);
		if (!suspension || !job.subAgentId) return false;
		if (suspension.checkpoint.finishReason !== 'paused') {
			if (!(await this.getApproval(job))) return false;
			if (!(await this.checkpointStorage.markUserPaused(job.subAgentId, suspension))) return false;
			suspension = await this.getCheckpoint(job);
			if (!suspension) return false;
		}
		const paused = await this.jobRepository.pauseIfRequested(
			job,
			formatPauseHandoff(suspension.checkpoint),
			suspension.runId,
			suspension.serializedState,
		);
		if (paused) {
			await this.retainLatestStopGroup(job);
			this.notifyJobUpdate(job);
			await this.requestWakeSafely(job.parentThreadId);
		}
		return paused;
	}

	async suspend(jobId: string): Promise<boolean> {
		if (await this.pause(jobId)) return true;
		const job = await this.jobRepository.findById(jobId);
		if (!job) return false;
		if (job.status !== 'running') {
			if (job.status !== 'suspended' && job.status !== 'paused')
				await this.clearChildCheckpoint(job);
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
			if (
				latest &&
				latest.status !== 'running' &&
				latest.status !== 'suspended' &&
				latest.status !== 'paused'
			)
				await this.clearChildCheckpoint(latest);
			return false;
		}
		this.notifyJobUpdate(job);
		await this.requestWakeSafely(job.parentThreadId);
		return true;
	}

	async settlePausedSubAgent(jobId: string, expected: ExpectedBackgroundJobState): Promise<void> {
		if (await this.suspend(jobId)) return;
		const job = await this.jobRepository.findById(jobId);
		if (job?.kind !== 'subagent' || job.status !== expected.status || !job.childThreadId) return;
		if (await this.executionRepository.existsRunningByThread(job.childThreadId)) return;
		if (await this.getCheckpoint(job)) return;
		await this.settle(
			jobId,
			{ status: 'failed', error: EXPIRED_BACKGROUND_CHECKPOINT_ERROR },
			expected,
		);
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

	async markMailConsumed(
		parentThreadId: string,
		jobIds: string[],
		includePauseReports = false,
	): Promise<number> {
		if (this.agentsConfig.backgroundTasksEnabled) {
			const { AgentWakeService } = await import('./agent-wake.service.js');
			// A tool can read these results during a wake. Wait for chat delivery before marking them.
			if (Container.get(AgentWakeService).isWakeActive(parentThreadId)) return 0;
		}
		return await this.consumeMail(parentThreadId, jobIds, includePauseReports);
	}

	private async consumeMail(
		parentThreadId: string,
		jobIds: string[],
		includePauseReports = false,
	): Promise<number> {
		const count = await this.jobRepository.markMailConsumed(
			parentThreadId,
			jobIds,
			includePauseReports,
		);
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
		await this.pruneExpiredPausedJobs(parentThreadId);
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
			files: job.files,
			skippedFiles: job.skippedFiles,
			createdAt: job.createdAt,
			timeoutAt: job.timeoutAt,
			settledAt: job.settledAt,
			notifiedAt: job.notifiedAt,
			childExecutionId: job.childExecutionId,
			pauseRequestId: job.pauseRequestId,
			planId: job.planId,
			planTaskId: job.planTaskId,
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
		options: { includePaused?: boolean } = {},
	): Promise<Array<BackgroundJobGroupItem & Pick<AgentBackgroundJobDto, 'approval'>>> {
		const candidates = await this.jobRepository.findGroupCandidates(parentAgentId, parentThreadId);
		const stoppingRequests = new Set(
			candidates
				.filter(
					(job) =>
						job.pauseRequestId &&
						!job.notifiedAt &&
						(job.status === 'running' || job.status === 'suspended'),
				)
				.map((job) => job.pauseRequestId),
		);
		const jobs = candidates
			.filter(
				(job) =>
					options.includePaused ||
					(job.pauseRequestId ? stoppingRequests.has(job.pauseRequestId) : job.status !== 'paused'),
			)
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
		let group: BackgroundJobGroupItem[] = [];
		let groupEndsAt = Number.NEGATIVE_INFINITY;

		for (const job of jobs) {
			const startedAt = job.createdAt.getTime();
			// A gap with no running jobs starts a new group.
			if (startedAt > groupEndsAt) group = [];
			group.push(job);
			groupEndsAt = Math.max(
				groupEndsAt,
				job.status === 'running' ||
					job.status === 'suspended' ||
					(options.includePaused && job.status === 'paused')
					? Number.POSITIVE_INFINITY
					: (job.settledAt?.getTime() ?? startedAt),
			);
		}

		// Keep stop outcomes visible in Preview after the parent consumes the report.
		if (
			!group.some(
				(job) =>
					job.status === 'running' ||
					job.status === 'suspended' ||
					(options.includePaused && (job.status === 'paused' || job.pauseRequestId)) ||
					!job.notifiedAt,
			)
		)
			return [];

		return await Promise.all(
			group.map(async (job) => {
				if (job.status !== 'suspended' || job.pauseRequestId) return job;
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
		expected?: ExpectedBackgroundJobState,
	): Promise<'cancelled' | 'not-found' | 'already-settled'> {
		const [job] = await this.jobRepository.findByParentThread(parentThreadId, [jobId]);
		if (!job) return 'not-found';
		if (job.status !== 'running' && job.status !== 'suspended' && job.status !== 'paused')
			return 'already-settled';

		if (job.kind === 'workflow') return await this.cancelWorkflowJob(job);

		const claimed = await this.jobRepository.settleIfActive(
			jobId,
			{ status: 'cancelled' },
			expected,
		);
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
		await this.cancelChildren(parentAgentId, parentThreadId, parentResourceId);
	}

	async cancelForSession(parentAgentId: string, parentThreadId: string): Promise<void> {
		await this.cancelChildren(parentAgentId, parentThreadId);
	}

	requestCancelForSession(parentAgentId: string, parentThreadId: string): void {
		this.markPendingChildrenCancelled(parentAgentId, parentThreadId);
	}

	private async cancelChildren(
		parentAgentId: string,
		parentThreadId: string,
		parentResourceId?: string,
	): Promise<void> {
		this.markPendingChildrenCancelled(parentAgentId, parentThreadId, parentResourceId);
		const jobs = await this.jobRepository.findByParentThread(parentThreadId);
		for (const job of jobs) {
			if (
				job.kind === 'subagent' &&
				job.parentAgentId === parentAgentId &&
				(parentResourceId === undefined || job.parentResourceId === parentResourceId) &&
				(job.status === 'running' || job.status === 'suspended')
			) {
				await this.cancel(parentThreadId, job.id, { status: job.status });
			}
		}
	}

	private markPendingChildrenCancelled(
		parentAgentId: string,
		parentThreadId: string,
		parentResourceId?: string,
	): void {
		// A pending insert can finish after the query. Keep its cancellation intent until registration ends.
		for (const registration of this.pendingSubAgentJobs) {
			const { params } = registration;
			if (
				params.parentAgentId === parentAgentId &&
				params.parentThreadId === parentThreadId &&
				(parentResourceId === undefined || params.parentResourceId === parentResourceId)
			)
				registration.cancelRequested = true;
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
		if (!this.agentsConfig.backgroundTasksEnabled && !this.agentsConfig.planToolsEnabled) return;

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
	async reconcile(signal?: AbortSignal): Promise<void> {
		if (signal?.aborted) return;
		for (const job of await this.jobRepository.findSettledSubAgentsWithCheckpoints()) {
			if (signal?.aborted) return;
			await this.clearChildCheckpoint(job);
		}
		for (const job of await this.jobRepository.findRequestedPauses()) {
			if (signal?.aborted) return;
			if (job.status === 'suspended' && job.notifiedAt && job.timeoutAt) {
				if (
					(await this.executionRepository.findRunningByThread(job.parentThreadId, {})).length === 0
				)
					await this.releaseResumeReservations([job], job.timeoutAt);
			} else if (job.status === 'paused') {
				await this.retainLatestStopGroup(job);
			} else {
				await this.pause(job.id);
			}
		}
		if (signal?.aborted) return;
		await this.failJobsPastTimeout(signal);
		if (signal?.aborted) return;
		await this.pruneExpiredPausedJobs();
		if (signal?.aborted) return;
		await this.failOrphanedSubAgentJobs(
			await this.jobRepository.findRunningJobs('subagent'),
			signal,
		);
		if (signal?.aborted) return;
		await this.reconcileWorkflowJobs(signal);
	}

	/**
	 * Reconcile workflow outcomes and pending stops even when the feature flag
	 * is off. Jobs created while the flag was on must still settle.
	 */
	async reconcileWorkflowJobs(signal?: AbortSignal): Promise<void> {
		if (signal?.aborted) return;
		const jobs = await this.jobRepository.findRunningJobs('workflow');
		await this.settleFinishedWorkflowJobs(jobs, signal);
		for (const job of jobs) {
			if (signal?.aborted) return;
			if (!job.pauseRequestId) continue;
			try {
				await this.cancelWorkflowJob(job);
			} catch (error) {
				this.logger.warn('Failed to finish a requested workflow stop', { jobId: job.id, error });
			}
		}

		if (signal?.aborted) return;
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
		if (!(await this.stopWorkflowJobExecution(job))) {
			if (job.pauseRequestId) await this.settleFinishedWorkflowJobs([job]);
			return 'already-settled';
		}

		if (job.pauseRequestId) {
			await this.settle(job.id, {
				status: 'cancelled',
				result: job.childExecutionId
					? (await this.loadExecutionOutput(job, job.childExecutionId, 'cancelled', true)).result
					: null,
			});
			return 'cancelled';
		}

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
	private async settleFinishedWorkflowJobs(
		jobs: AgentBackgroundJob[],
		signal?: AbortSignal,
	): Promise<boolean> {
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
			if (signal?.aborted) break;
			settledAny =
				(await this.settleFinishedWorkflowJob(job, statuses.get(job.childExecutionId))) ||
				settledAny;
		}

		return settledAny;
	}

	/** Read retained output when the execution data is not in memory. */
	private async loadExecutionOutput(
		job: AgentBackgroundJob,
		executionId: string,
		status: AgentBackgroundJobSettlement['status'],
		allOutputs = false,
	): Promise<{ result: string | null } & JobOutputFiles> {
		// A failed data read must not block the settle: workflow jobs have no
		// timeout, so a row skipped here could stay running forever.
		try {
			const execution = await this.executionPersistence.findSingleExecution(executionId, {
				includeData: true,
				unflattenData: true,
			});

			const runData = execution?.data?.resultData?.runData;
			if (!runData) return { result: null, ...NO_OUTPUT_FILES };

			return {
				result: serializeWorkflowJobResult(collectResultData(runData, allOutputs)),
				...(status === 'completed' ? await this.storeOutputFiles(job, runData) : NO_OUTPUT_FILES),
			};
		} catch (error) {
			this.logger.warn('Failed to read a finished execution’s data for its job result', {
				executionId,
				error: error instanceof Error ? error.message : String(error),
			});
			return { result: null, ...NO_OUTPUT_FILES };
		}
	}

	private async failJobsPastTimeout(signal?: AbortSignal): Promise<void> {
		const timedOut = await this.jobRepository.findActivePastTimeout(new Date());
		for (const job of timedOut) {
			if (signal?.aborted) return;
			if (job.status !== 'running' && job.status !== 'suspended') continue;
			if (job.status === 'suspended' && job.pauseRequestId && job.notifiedAt && job.timeoutAt) {
				await this.releaseResumeReservations([job], job.timeoutAt);
				continue;
			}
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
	private async failOrphanedSubAgentJobs(
		jobs: AgentBackgroundJob[],
		signal?: AbortSignal,
	): Promise<boolean> {
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
			if (signal?.aborted) break;
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
			const output =
				status === 'completed' || job.pauseRequestId
					? await this.loadExecutionOutput(job, executionId, status, Boolean(job.pauseRequestId))
					: { result: null, ...NO_OUTPUT_FILES };
			const settled = await this.settle(job.id, {
				status,
				...output,
				error: executionStatus === 'success' ? null : `Execution ${executionStatus}`,
			});
			if (!settled) await this.deleteUnusedFiles(job.id, output.files);
			return settled;
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
