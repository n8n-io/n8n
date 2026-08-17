import { Logger } from '@n8n/backend-common';
import type { StorageLocation } from '@n8n/blob-storage';
import { Service } from '@n8n/di';
import chunk from 'lodash/chunk';
import { ErrorReporter, StorageConfig } from 'n8n-core';
import { UnexpectedError } from 'n8n-workflow';

import type { AgentRunTelemetryType, IAgentConfigurationTelemetryProperties } from '@/interfaces';
import { Telemetry } from '@/telemetry';

import {
	AgentChatAttachmentService,
	type StoredAttachmentRef,
} from './agent-chat-attachment.service';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { AgentWorkspaceService } from './agent-workspace.service';
import { AgentExecutionThread } from './entities/agent-execution-thread.entity';
import { AgentExecution } from './entities/agent-execution.entity';
import type { MessageRecord, TimelineEvent } from './execution-recorder';
import { AgentExecutionLogStore } from './execution-log/agent-execution-log-store';
import { N8nMemory } from './integrations/n8n-memory';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import type { AgentExecutionThreadMetadata } from './repositories/agent-execution-thread.repository';
import {
	AgentExecutionRepository,
	type RunningAgentExecution,
} from './repositories/agent-execution.repository';

export interface RecordMessageParams {
	threadId: string;
	agentId: string;
	agentName: string;
	projectId: string;
	userMessage: string | null;
	/** Attachments included on the user turn; persisted on the run for the sessions view. */
	attachments?: StoredAttachmentRef[];
	record: MessageRecord;
	/** Set to 'suspended' or 'resumed' for HITL tool call flows. */
	hitlStatus?: 'suspended' | 'resumed';
	/** Where the message originated from, e.g. 'chat', 'slack', 'task'. */
	source?: string;
	/** Optional metadata persisted on the thread when it is first created. */
	threadMetadata?: AgentExecutionThreadMetadata;
	/** When the run was triggered by a scheduled task, the task's id (stamped on the session). */
	taskId?: string;
	/** Published agent_history version that supplied the scheduled task snapshot. */
	taskVersionId?: string;
	/** Backend heartbeat telemetry context for this recorded run. */
	telemetry?: {
		runType: AgentRunTelemetryType;
		configuration: IAgentConfigurationTelemetryProperties;
	};
}

export type StartExecutionParams = Omit<RecordMessageParams, 'record' | 'hitlStatus'>;

interface TimelineSnapshotParams {
	executionId: string;
	projectId: string;
	agentId: string;
	threadId: string;
	timeline: TimelineEvent[];
}

export interface ThreadDetail {
	thread: AgentExecutionThread;
	executions: AgentExecution[];
}

export interface ThreadListItem extends Omit<AgentExecutionThread, 'generateId' | 'setUpdateDate'> {
	firstMessage: string | null;
	/** Earliest non-null execution source for the thread (e.g. slack, telegram). */
	source: string | null;
}

const TIMELINE_SNAPSHOT_RETRY_DELAY_MS = 1_000;

@Service()
export class AgentExecutionService {
	/** Batch size mirrors ExecutionPersistence.bulkDeletionBatchSize. */
	private static readonly logDeletionBatchSize = 500;

	private static readonly heartbeatIntervalMs = 30_000;

	private readonly heartbeatTimers = new Map<string, NodeJS.Timeout>();

	private readonly pendingTimelineSnapshots = new Map<
		string,
		Omit<TimelineSnapshotParams, 'executionId'>
	>();

	private readonly timelineSnapshotWrites = new Map<string, Promise<void>>();

	private readonly executionsNeedingTitleSync = new Set<string>();

	constructor(
		private readonly logger: Logger,
		private readonly agentExecutionRepository: AgentExecutionRepository,
		private readonly agentExecutionThreadRepository: AgentExecutionThreadRepository,
		private readonly n8nMemory: N8nMemory,
		private readonly telemetry: Telemetry,
		private readonly agentChatAttachmentService: AgentChatAttachmentService,
		private readonly agentExecutionLogStore: AgentExecutionLogStore,
		private readonly storageConfig: StorageConfig,
		private readonly errorReporter: ErrorReporter,
		private readonly executionUpdateBroadcaster: AgentExecutionUpdateBroadcaster,
		private readonly agentWorkspaceService: AgentWorkspaceService,
	) {}

	async startExecutionRecording(params: StartExecutionParams, startedAt: Date): Promise<string> {
		const { userMessage, created } = await this.prepareThread(params);
		const inserted = await this.agentExecutionRepository.save(
			this.agentExecutionRepository.create({
				threadId: params.threadId,
				status: 'running',
				startedAt,
				stoppedAt: null,
				duration: 0,
				userMessage,
				model: null,
				promptTokens: null,
				completionTokens: null,
				totalTokens: null,
				cost: null,
				timeline: null,
				storedAt: 'db',
				error: null,
				hitlStatus: null,
				source: params.source ?? null,
				attachments: params.attachments?.length ? params.attachments : null,
			}),
		);
		if (created) this.executionsNeedingTitleSync.add(inserted.id);
		this.startHeartbeat(inserted.id);
		this.executionUpdateBroadcaster.notify({
			projectId: params.projectId,
			agentId: params.agentId,
			threadId: params.threadId,
			executionId: inserted.id,
		});
		return inserted.id;
	}

	recordTimelineSnapshot({ executionId, ...snapshot }: TimelineSnapshotParams): void {
		this.pendingTimelineSnapshots.set(executionId, snapshot);
		this.ensureTimelineSnapshotWrite(executionId);
	}

	async finalizeExecution(executionId: string, params: RecordMessageParams): Promise<string> {
		const { record, hitlStatus } = params;
		const status = executionStatus(record);
		let storedAt: AgentExecution['storedAt'] =
			record.timeline.length > 0 ? this.storageConfig.modeTag : 'db';

		try {
			if (storedAt !== 'db') {
				try {
					await this.agentExecutionLogStore.write(
						{ agentId: params.agentId, threadId: params.threadId, executionId },
						{ timeline: record.timeline },
						storedAt,
					);
				} catch (error) {
					this.errorReporter.error(error);
					storedAt = 'db';
				}
			}

			const finalized = await this.agentExecutionRepository.updateIfRunning(executionId, {
				status,
				stoppedAt: new Date(record.startTime + record.duration),
				duration: record.duration,
				model: record.model,
				promptTokens: record.usage?.promptTokens ?? null,
				completionTokens: record.usage?.completionTokens ?? null,
				totalTokens: record.usage?.totalTokens ?? null,
				cost: record.totalCost,
				timeline: storedAt === 'db' && record.timeline.length > 0 ? record.timeline : null,
				storedAt,
				error: record.error,
				hitlStatus: hitlStatus ?? null,
			});
			if (!finalized) return executionId;

			this.executionUpdateBroadcaster.notify({
				projectId: params.projectId,
				agentId: params.agentId,
				threadId: params.threadId,
				executionId,
			});
			await this.completeRecordedExecution(params, executionId, status);
			return executionId;
		} catch (error) {
			this.errorReporter.error(error);
			throw error;
		} finally {
			this.stopHeartbeat(executionId);
			this.executionsNeedingTitleSync.delete(executionId);
		}
	}

	async finalizeInterruptedExecution(execution: RunningAgentExecution): Promise<boolean> {
		const timeline = execution.timeline ?? [];
		const stoppedAt = new Date();
		const duration = execution.startedAt
			? Math.max(0, stoppedAt.getTime() - execution.startedAt.getTime())
			: 0;
		const finalized = await this.agentExecutionRepository.updateIfRunning(execution.id, {
			status: 'interrupted',
			stoppedAt,
			duration,
			timeline: timeline.length > 0 ? timeline : null,
			storedAt: 'db',
			error: 'Agent execution was interrupted by a process restart.',
		});
		if (finalized) void this.notifyInterruptedExecution(execution);
		return finalized;
	}

	private async notifyInterruptedExecution(execution: RunningAgentExecution): Promise<void> {
		try {
			const thread = await this.agentExecutionThreadRepository.findOneBy({
				id: execution.threadId,
			});
			if (!thread) return;
			this.executionUpdateBroadcaster.notify({
				projectId: thread.projectId,
				agentId: thread.agentId,
				threadId: execution.threadId,
				executionId: execution.id,
			});
		} catch (error) {
			this.logger.warn('Failed to resolve an interrupted agent execution update', {
				executionId: execution.id,
				threadId: execution.threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private startHeartbeat(executionId: string): void {
		const timer = setInterval(() => {
			void this.agentExecutionRepository.touchRunning(executionId).catch((error: unknown) => {
				this.logger.warn('Failed to heartbeat a running agent execution', {
					executionId,
					error: error instanceof Error ? error.message : String(error),
				});
			});
		}, AgentExecutionService.heartbeatIntervalMs);
		timer.unref();
		this.heartbeatTimers.set(executionId, timer);
	}

	private stopHeartbeat(executionId: string): void {
		const timer = this.heartbeatTimers.get(executionId);
		if (timer) clearInterval(timer);
		this.heartbeatTimers.delete(executionId);
	}

	private ensureTimelineSnapshotWrite(executionId: string): void {
		if (
			this.timelineSnapshotWrites.has(executionId) ||
			!this.pendingTimelineSnapshots.has(executionId)
		) {
			return;
		}
		const write = this.drainTimelineSnapshots(executionId).finally(() => {
			this.timelineSnapshotWrites.delete(executionId);
			this.ensureTimelineSnapshotWrite(executionId);
		});
		this.timelineSnapshotWrites.set(executionId, write);
	}

	private async drainTimelineSnapshots(executionId: string): Promise<void> {
		while (true) {
			const snapshot = this.pendingTimelineSnapshots.get(executionId);
			if (!snapshot) return;
			this.pendingTimelineSnapshots.delete(executionId);
			try {
				if (
					!(await this.agentExecutionRepository.updateTimelineIfRunning(
						executionId,
						snapshot.timeline,
					))
				) {
					this.pendingTimelineSnapshots.delete(executionId);
					return;
				}
				this.executionUpdateBroadcaster.notify({
					projectId: snapshot.projectId,
					agentId: snapshot.agentId,
					threadId: snapshot.threadId,
					executionId,
				});
			} catch (error) {
				if (!this.pendingTimelineSnapshots.has(executionId)) {
					this.pendingTimelineSnapshots.set(executionId, snapshot);
				}
				this.logger.warn('Failed to persist an agent execution timeline snapshot; retrying', {
					executionId,
					error: error instanceof Error ? error.message : String(error),
				});
				await new Promise<void>((resolve) => {
					const timer = setTimeout(resolve, TIMELINE_SNAPSHOT_RETRY_DELAY_MS);
					timer.unref();
				});
			}
		}
	}

	private async prepareThread(
		params: StartExecutionParams,
	): Promise<{ userMessage: string | null; created: boolean }> {
		const { thread, created } = await this.agentExecutionThreadRepository.findOrCreate(
			params.threadId,
			params.agentId,
			params.agentName,
			params.projectId,
			params.threadMetadata,
			params.taskId,
			params.taskVersionId,
		);
		if (!created) {
			await this.agentExecutionThreadRepository.bumpUpdatedAt(params.threadId);
			if (!thread.title) await this.syncTitleFromMemory(params.threadId, params.agentId);
		}
		return { userMessage: cleanUserMessage(params.userMessage, params.agentName), created };
	}

	private async completeRecordedExecution(
		params: RecordMessageParams,
		executionId: string,
		status: AgentExecution['status'],
	): Promise<void> {
		const { threadId, agentId, record, hitlStatus } = params;
		if (hitlStatus === 'resumed' && record.model) {
			await this.backfillSuspendedExecutions(threadId, record.model);
		}
		if (record.usage) {
			await this.agentExecutionThreadRepository.incrementUsage(
				threadId,
				record.usage.promptTokens,
				record.usage.completionTokens,
				record.totalCost ?? 0,
				record.duration,
			);
		}
		if (params.telemetry) {
			try {
				this.telemetry.trackAgentTurnFinished({
					agent_id: agentId,
					thread_id: threadId,
					run_type: params.telemetry.runType,
					turn_status: status === 'success' ? 'succeeded' : 'failed',
					configuration: params.telemetry.configuration,
					latency_ms: record.duration,
					cost: record.totalCost ?? 0,
					token_count: record.usage?.totalTokens ?? 0,
					tool_call_count: record.timeline.filter((event) => event.type === 'tool-call').length,
				});
			} catch (error) {
				this.logger.warn('Failed to track agent execution telemetry', {
					agentId,
					threadId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		this.logger.debug('Recorded agent execution', {
			executionId,
			threadId,
			agentId,
			status,
			duration: record.duration,
		});
		if (this.executionsNeedingTitleSync.has(executionId)) {
			await this.syncTitleFromMemory(threadId, agentId);
		}
	}

	/**
	 * The most recently suspended execution in a thread, or null if there is
	 * none. Used to recover the original run's `source` when resuming a HITL
	 * tool call.
	 */
	async findLatestSuspendedRun(threadId: string): Promise<AgentExecution | null> {
		return await this.agentExecutionRepository.findLatestSuspendedByThreadId(threadId);
	}

	/**
	 * Backfill `model` on suspended runs in a thread that don't yet have it.
	 * Called when the resumed run finishes — the model applies to the whole
	 * suspend/resume cycle but only arrives once the resume completes.
	 */
	private async backfillSuspendedExecutions(threadId: string, model: string): Promise<void> {
		const candidates = await this.agentExecutionRepository.findSuspendedWithoutModel(threadId);
		if (candidates.length === 0) return;
		await this.agentExecutionRepository.backfillModel(
			candidates.map((c) => c.id),
			model,
		);
	}

	/**
	 * Try to read the title from the SDK memory thread and sync it to our execution thread.
	 * The SDK's titleGeneration runs fire-and-forget after the first message,
	 * so the title is typically available by the second message.
	 */
	private async syncTitleFromMemory(threadId: string, agentId: string): Promise<void> {
		try {
			const memoryThread = await this.n8nMemory.getImplementation(agentId).getThread(threadId);
			if (memoryThread?.title) {
				const emoji =
					memoryThread.metadata && typeof memoryThread.metadata.emoji === 'string'
						? memoryThread.metadata.emoji
						: null;
				await this.agentExecutionThreadRepository.update(threadId, {
					title: memoryThread.title,
					...(emoji && { emoji }),
				});
			}
		} catch {
			// Memory thread may not exist (agent without memory configured) — ignore
		}
	}

	/**
	 * Delete a thread and all its associated runs. The FK on agent_execution
	 * cascades, so deleting the thread removes the runs in one statement.
	 * Blob-stored timelines are deleted in parallel with the thread row.
	 */
	async deleteThread(projectId: string, agentId: string, threadId: string): Promise<boolean> {
		// Verify ownership before deleting anything
		const thread = await this.agentExecutionThreadRepository.findOneBy({
			id: threadId,
			projectId,
			agentId,
		});
		if (!thread) return false;

		const blobRefs = this.toBlobRefs(
			await this.agentExecutionRepository.findBlobRefsByThreadId(threadId),
		);

		await this.n8nMemory.getImplementation(agentId).deleteThread(threadId);
		await this.agentChatAttachmentService.deleteByThread(threadId, { projectId });
		await Promise.all([
			this.agentWorkspaceService.cleanupThreadWorkspace(projectId, agentId, threadId),
			this.agentExecutionThreadRepository.delete({ id: threadId }),
			this.agentExecutionLogStore.delete(
				blobRefs.map((r) => ({ agentId, threadId, executionId: r.id, storedAt: r.storedAt })),
			),
		]);
		return true;
	}

	/**
	 * Delete every blob-stored execution log across an agent's threads. Called
	 * before the agent row is removed (the row cascade deletes the DB side).
	 */
	async deleteExecutionLogsForAgent(agentId: string): Promise<void> {
		const refs = this.toBlobRefs(
			await this.agentExecutionRepository.findBlobRefsByAgentId(agentId),
		);
		for (const batch of chunk(refs, AgentExecutionService.logDeletionBatchSize)) {
			await this.agentExecutionLogStore.delete(
				batch.map((r) => ({
					agentId,
					threadId: r.threadId,
					executionId: r.id,
					storedAt: r.storedAt,
				})),
			);
		}
	}

	/**
	 * Get paginated execution threads for an agent.
	 * Each thread is annotated with the first non-empty user message for preview
	 * and the earliest non-null execution source for channel origin.
	 */
	async getThreads(
		projectId: string,
		agentId: string,
		limit: number,
		cursor?: string,
	): Promise<{ threads: ThreadListItem[]; nextCursor: string | null }> {
		const page = await this.agentExecutionThreadRepository.findByProjectIdPaginated(
			projectId,
			agentId,
			limit,
			cursor,
		);

		if (page.threads.length === 0) {
			return { threads: [], nextCursor: page.nextCursor };
		}

		const threadIds = page.threads.map((t) => t.id);
		const [messageMap, sourceMap] = await Promise.all([
			this.agentExecutionRepository.findFirstUserMessageByThreadIds(threadIds),
			this.agentExecutionRepository.findFirstSourceByThreadIds(threadIds),
		]);

		return {
			...page,
			threads: page.threads.map((t) => ({
				...t,
				firstMessage: messageMap.get(t.id) ?? null,
				source: sourceMap.get(t.id) ?? null,
			})),
		};
	}

	/**
	 * Get a thread with all its executions.
	 * Validates projectId and agentId ownership.
	 */
	async getThreadDetail(
		threadId: string,
		projectId: string,
		agentId: string,
	): Promise<ThreadDetail | null> {
		const thread = await this.agentExecutionThreadRepository.findOneBy({ id: threadId });
		if (!thread || !threadBelongsTo(thread, projectId, agentId)) return null;

		const executions = await this.agentExecutionRepository.findByThreadIdOrdered(threadId);
		await this.hydrateTimelines(agentId, threadId, executions);
		return { thread, executions };
	}

	/**
	 * Fill in `timeline` for blob-stored executions. Blob problems — missing
	 * blobs, corrupted blobs, unregistered storage locations, or read failures —
	 * degrade to a null timeline instead of failing the request, so the thread
	 * always opens. Corruption, unregistered locations, and read failures are
	 * reported; missing blobs degrade silently.
	 */
	private async hydrateTimelines(
		agentId: string,
		threadId: string,
		executions: AgentExecution[],
	): Promise<void> {
		const blobStored = this.toBlobRefs(executions);
		if (blobStored.length === 0) return;

		const readable = blobStored.filter((e) => this.agentExecutionLogStore.hasLocation(e.storedAt));
		if (readable.length < blobStored.length) {
			this.errorReporter.error(
				new UnexpectedError(
					'Skipped reading agent execution logs for unconfigured storage location',
					{
						extra: { threadId, skipped: blobStored.length - readable.length },
					},
				),
			);
		}
		if (readable.length === 0) return;

		let entries;
		try {
			entries = await this.agentExecutionLogStore.readMany(
				readable.map((e) => ({ agentId, threadId, executionId: e.id, storedAt: e.storedAt })),
			);
		} catch (error) {
			this.errorReporter.error(error);
			return;
		}
		for (const execution of readable) {
			const entry = entries.get(execution.id);
			if (entry) execution.timeline = entry.timeline;
		}
	}

	/**
	 * Fetch a thread by id without scoping. Callers accepting a client-supplied
	 * threadId MUST verify ownership with {@link threadBelongsTo} before use to
	 * prevent IDOR.
	 */
	async findThreadById(threadId: string): Promise<AgentExecutionThread | null> {
		return await this.agentExecutionThreadRepository.findOneBy({ id: threadId });
	}

	/** Narrow refs to those whose data lives in a blob store, i.e. all but `db`. */
	private toBlobRefs<T extends { storedAt: AgentExecution['storedAt'] }>(refs: T[]) {
		return refs.filter((r): r is T & { storedAt: StorageLocation } => r.storedAt !== 'db');
	}
}

function cleanUserMessage(message: string | null, agentName: string): string | null {
	if (message === null) return null;
	const cleaned = message
		.replace(/<@[A-Z0-9]+>/gi, `@${agentName}`)
		.replace(/@[A-Z0-9]{8,}/gi, `@${agentName}`)
		.trim();
	return cleaned.length > 0 ? cleaned : null;
}

function executionStatus(record: MessageRecord): AgentExecution['status'] {
	if (record.error !== null || record.finishReason === 'error') return 'error';
	if (record.finishReason === 'cancelled') return 'cancelled';
	return 'success';
}

/**
 * True if `thread` belongs to the given project and agent.
 * Returns false for threads from a different project/agent so the caller can
 * reject the request instead of leaking/modifying unrelated thread data.
 */
export function threadBelongsTo(
	thread: AgentExecutionThread,
	projectId: string,
	agentId: string,
): boolean {
	if (thread.projectId !== projectId) return false;
	if (thread.agentId !== agentId) return false;
	return true;
}
