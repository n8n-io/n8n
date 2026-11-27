import type { Thread } from '@n8n/agents';
import type {
	AgentExecutionStatus,
	AgentMessageAuthor,
	AgentN8nChatThreadSummary,
	AgentN8nChatThreadsResponse,
	AgentSessionPreviewAccess,
	AgentSessionQueryFilters,
	AgentSessionStatus,
	AgentTokenUsage,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { StorageLocation } from '@n8n/blob-storage';
import { TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import chunk from 'lodash/chunk';
import groupBy from 'lodash/groupBy';
import { ErrorReporter, StorageConfig } from 'n8n-core';

import { ConflictError, OperationalError, UnexpectedError } from '@n8n/errors';

import { AgentProjectDeletionRepository } from './repositories/agent-project-deletion.repository';
import { AgentAttentionFlagRepository } from './repositories/agent-attention-flag.repository';
import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import type {
	AgentRunTelemetryType,
	IAgentConfigurationTelemetryProperties,
} from './agent-telemetry.types';
import { AgentUsageTelemetryService } from './agent-usage-telemetry.service';
import type { StoredAttachmentRef } from './types/agent-chat-attachment';
import {
	AgentExecutionMetrics,
	type AgentMetricsSubject,
	type FinishedAgentExecutionStatus,
} from './agent-execution-metrics';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { AgentTurnAlreadyRunningError } from './agent-turn-already-running.error';
import { SESSION_STOPPED_REASON } from './agent-session-stop-reason';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';
import {
	checkpointExecutionId,
	EXECUTION_METADATA_KEY,
	type AgentExecutionAdmission,
} from './types/agent-queued-message';
import { AgentMessageRepository } from './repositories/agent-message.repository';
import { SystemAgentRegistry } from './system-agents/system-agent-registry';
import type { AgentMessageEntity, AgentMessageOrigin } from './entities/agent-message.entity';
import { messageToDto } from './agent-message-mapper';
import { buildInboundUserMessage } from './utils/inbound-attachments';
import { buildAgentTurnMetrics } from './agent-telemetry';
import { toAgentRef } from './utils/agent-ref';
import {
	AgentExecutionThread,
	type AgentThreadAccess,
} from './entities/agent-execution-thread.entity';
import { AgentExecution, type AgentExecutionHitlStatus } from './entities/agent-execution.entity';
import { isProjectAgent } from './entities/agent.entity';
import type { MessageRecord, TimelineEvent } from './execution-recorder';
import {
	AgentExecutionLogStore,
	type AgentExecutionLogRef,
} from './execution-log/agent-execution-log-store';
import { IntegrationMessageContextService } from './integrations/integration-message-context.service';
import { N8nMemory } from './integrations/n8n-memory';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import {
	draftChatMemoryResourceId,
	productionChatMemoryResourceId,
} from './utils/agent-memory-scope';
import {
	canContinueThreadInN8nChat,
	canContinueThreadInPreview,
	canUseTopLevelDraftThread,
	threadBelongsTo,
	type AgentSessionMode,
} from './utils/agent-thread-access';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import type { AgentExecutionThreadMetadata } from './repositories/agent-execution-thread.repository';
import {
	AgentExecutionRepository,
	type AgentExecutionLinks,
	type RunningAgentExecution,
} from './repositories/agent-execution.repository';
import {
	computeExecutionFailureSummary,
	type ThreadFailureSummary,
} from './utils/execution-failure-summary';
import { applyFatalSessionOutcome } from './utils/fatal-session-outcome';
import type { ChatHistoryPageRequest } from './utils/chat-history-page';

export interface RecordMessageParams {
	threadId: string;
	agentId: string;
	agentName: string;
	projectId: string;
	userMessage: string | null;
	/** Chat platform user who wrote the turn; shown as the sender in the sessions view. */
	author?: AgentMessageAuthor;
	/** Attachments included on the original input message. */
	attachments?: StoredAttachmentRef[];
	record: MessageRecord;
	/** Set to 'suspended' or 'resumed' for HITL tool call flows. */
	hitlStatus?: AgentExecutionHitlStatus;
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
		userId?: string;
		runType: AgentRunTelemetryType;
		configuration: IAgentConfigurationTelemetryProperties;
	};
}

export interface StartExecutionParams extends Omit<RecordMessageParams, 'record' | 'hitlStatus'> {
	resourceId: string;
	messageOrigin?: Omit<AgentMessageOrigin, 'source' | 'hidden'>;
	hideUserMessageFromTranscript?: boolean;
	access: AgentThreadAccess;
	previewChat?: boolean;
	/** Whether the execution accepts mid-turn steering. See `acceptsSteering` in `types/agent-queued-message`. */
	acceptsSteering?: boolean;
	sessionMode?: AgentSessionMode;
	initialTimeline?: TimelineEvent[];
	/** Links a delegated run to the execution that started it. Absent for a top-level turn. */
	executionLinks?: AgentExecutionLinks;
	/** Internal admission data. These fields are not stored on the execution. */
	queueItemId?: string;
	resumeRunId?: string;
	allowSuspendedPredecessor?: boolean;
}

export interface AgentExecutionReservation {
	execution: AgentExecution;
	needsTitleSync: boolean;
	inputMessageIds: string[];
}

interface TimelineSnapshotParams extends AgentExecutionLogRef {
	projectId: string;
	timeline: TimelineEvent[];
}

export interface ThreadDetail {
	thread: AgentExecutionThread;
	executions: AgentExecution[];
}

/** One page of a thread's turns, oldest first. */
export interface ThreadDetailPage extends ThreadDetail {
	/** Whether the thread has turns older than this page. */
	hasOlder: boolean;
}

export interface ThreadListItem
	extends Omit<
			AgentExecutionThread,
			'generateId' | 'setUpdateDate' | 'ownerId' | 'accessScope' | 'owner'
		>,
		AgentSessionPreviewAccess {
	firstMessage: string | null;
	/** Earliest non-null execution source for the thread (e.g. slack, telegram). */
	source: string | null;
	failureSummary: ThreadFailureSummary | null;
	status: AgentSessionStatus | null;
}

const TIMELINE_SNAPSHOT_RETRY_DELAY_MS = 1_000;

@Service()
export class AgentExecutionService {
	/** Batch size mirrors ExecutionPersistence.bulkDeletionBatchSize. */
	private static readonly logDeletionBatchSize = 500;

	private static readonly heartbeatIntervalMs = 30_000;

	private readonly heartbeatTimers = new Map<string, NodeJS.Timeout>();
	private readonly executionControllers = new Map<string, AbortController>();

	private readonly pendingTimelineSnapshots = new Map<
		string,
		Omit<TimelineSnapshotParams, 'executionId'>
	>();

	private readonly timelineSnapshotWrites = new Map<string, Promise<void>>();
	private readonly pausedTimelineSnapshots = new Set<string>();

	private readonly executionsNeedingTitleSync = new Set<string>();

	/**
	 * Side-call cost report ids with an in-flight transaction. Concurrent
	 * deliveries of the same `reportId` coalesce onto the in-flight promise
	 * instead of each running its own transaction, which would double-count.
	 * The entry is removed when the attempt settles; a failed attempt is not
	 * claimed, so a later replay can retry.
	 */
	private readonly sideCallReportInFlight = new Map<string, Promise<void>>();

	/**
	 * Per-execution in-flight side-call cost recordings, drained by
	 * `writeTerminalExecution` before the terminal UPDATE.
	 */
	private readonly sideCallUsageInFlightByExecution = new Map<string, Set<Promise<void>>>();

	constructor(
		private readonly logger: Logger,
		private readonly agentExecutionRepository: AgentExecutionRepository,
		private readonly agentExecutionThreadRepository: AgentExecutionThreadRepository,
		private readonly n8nMemory: N8nMemory,
		private readonly agentUsageTelemetry: AgentUsageTelemetryService,
		private readonly agentChatAttachmentService: AgentChatAttachmentService,
		private readonly agentExecutionLogStore: AgentExecutionLogStore,
		private readonly storageConfig: StorageConfig,
		private readonly errorReporter: ErrorReporter,
		private readonly executionUpdateBroadcaster: AgentExecutionUpdateBroadcaster,
		private readonly checkpointStorage: N8NCheckpointStorage,
		private readonly txRunner: TransactionRunner,
		private readonly queueRepository: AgentMessageQueueRepository,
		private readonly messageRepository: AgentMessageRepository,
		private readonly systemAgents: SystemAgentRegistry,
		private readonly projectDeletion: AgentProjectDeletionRepository,
		private readonly attentionFlags: AgentAttentionFlagRepository,
		private readonly integrationMessageContext: IntegrationMessageContextService,
		private readonly metrics: AgentExecutionMetrics,
	) {}

	async startExecutionRecording(
		params: StartExecutionParams,
		startedAt: Date,
	): Promise<AgentExecutionAdmission> {
		const reservation = await this.txRunner.run(
			{},
			async (ctx) => await this.reserveExecution(params, startedAt, ctx),
		);
		this.activateExecution(reservation, params);
		return {
			executionId: reservation.execution.id,
			startedAt,
			inputMessageIds: reservation.inputMessageIds,
		};
	}

	async reserveExecution(
		params: StartExecutionParams,
		startedAt: Date,
		ctx: OperationContext,
		lockedQueueThread?: AgentExecutionThread,
	): Promise<AgentExecutionReservation> {
		return await this.projectDeletion.withWritableProject(
			params.projectId,
			async (ctx) => await this.reserveWritableExecution(params, startedAt, ctx, lockedQueueThread),
			ctx,
		);
	}

	private async reserveWritableExecution(
		params: StartExecutionParams,
		startedAt: Date,
		ctx: OperationContext,
		lockedQueueThread?: AgentExecutionThread,
	): Promise<AgentExecutionReservation> {
		// The queue already locked the session. Its consumer validates the owner before execution.
		const prepared = lockedQueueThread
			? { thread: lockedQueueThread, created: false }
			: await this.prepareThread(params, ctx);
		await this.agentExecutionThreadRepository.assertOwnerActive(prepared.thread, ctx);
		const { queueItem, predecessorId } = await this.checkAdmission(params, ctx);
		const execution = this.agentExecutionRepository.create({
			threadId: params.threadId,
			status: 'running',
			acceptsSteering: params.acceptsSteering === true,
			startedAt,
			stoppedAt: null,
			duration: 0,
			userMessage: null,
			author: null,
			model: null,
			promptTokens: null,
			cacheReadTokens: null,
			cacheWriteTokens: null,
			completionTokens: null,
			totalTokens: null,
			cost: null,
			parentExecutionId: params.executionLinks?.parentExecutionId ?? null,
			// Save the background job signal before notifying clients that the execution started.
			timeline: params.initialTimeline?.length ? params.initialTimeline : null,
			storedAt: 'db',
			error: null,
			failureSummary: null,
			hitlStatus: null,
			source: params.source ?? null,
			attachments: null,
		});
		const inserted = await this.agentExecutionRepository.saveInContext(execution, ctx);

		await this.agentExecutionThreadRepository.markChatResumedAfterStop(
			params.threadId,
			!params.hideUserMessageFromTranscript && params.userMessage !== null && !params.resumeRunId,
			ctx,
		);

		const inputMessageIds = await this.reserveInput(
			params,
			inserted.id,
			predecessorId,
			queueItem?.messageId,
			ctx,
		);
		if (
			queueItem &&
			!(await this.queueRepository.linkExecution(
				queueItem.id,
				queueItem.executionId,
				inserted.id,
				ctx,
			))
		) {
			throw new AgentTurnAlreadyRunningError();
		}
		return {
			execution: inserted,
			needsTitleSync: prepared.created || !prepared.thread.title,
			inputMessageIds,
		};
	}

	private async reserveInput(
		params: StartExecutionParams,
		executionId: string,
		predecessorId: string | undefined,
		queuedMessageId: string | undefined,
		ctx: OperationContext,
	): Promise<string[]> {
		if (predecessorId) {
			return await this.messageRepository.copyExecutionInputs(
				executionId,
				predecessorId,
				params.threadId,
				ctx,
			);
		}
		if (params.resumeRunId || params.userMessage === null) return [];
		if (queuedMessageId) {
			await this.messageRepository.linkExecutionInput(executionId, queuedMessageId, params, ctx);
			return [queuedMessageId];
		}
		const [content] = buildInboundUserMessage(params.userMessage, params.attachments ?? []);
		const message = await this.messageRepository.createInput(
			{
				threadId: params.threadId,
				resourceId: params.resourceId,
				content,
				author: params.author,
				origin: {
					...params.messageOrigin,
					source: params.source ?? null,
					...(params.hideUserMessageFromTranscript && { hidden: true }),
				},
			},
			ctx,
		);
		await this.messageRepository.linkExecutionInput(executionId, message.id, params, ctx);
		return [message.id];
	}

	private async checkAdmission(params: StartExecutionParams, ctx: OperationContext) {
		const { threadId, agentId, resumeRunId, queueItemId } = params;
		const running = await this.agentExecutionRepository.findRunningByThread(threadId, ctx);
		const active = await this.queueRepository.findActive(threadId, ctx);
		if (resumeRunId) {
			const checkpoint = await this.checkpointStorage.getStatus(resumeRunId, agentId, ctx);
			if (
				checkpoint.status !== 'active' ||
				checkpoint.checkpoint.status !== 'suspended' ||
				checkpoint.checkpoint.persistence?.threadId !== threadId
			) {
				throw new AgentTurnAlreadyRunningError();
			}
			const predecessorId = checkpointExecutionId(checkpoint.checkpoint);
			const legacyPredecessor = !predecessorId && !active && params.allowSuspendedPredecessor;
			if (
				running.some(({ id }) => id !== predecessorId) &&
				!(legacyPredecessor && running.length === 1)
			) {
				throw new AgentTurnAlreadyRunningError();
			}
			const inputExecutionId =
				checkpoint.checkpoint.persistence?.hostMetadata?.[EXECUTION_METADATA_KEY];
			return {
				queueItem: active,
				predecessorId: typeof inputExecutionId === 'string' ? inputExecutionId : undefined,
			};
		}
		if (
			running.length ||
			active ||
			(await this.checkpointStorage.findSuspendedForThread(agentId, threadId, ctx))
		) {
			throw new AgentTurnAlreadyRunningError();
		}
		const head = await this.queueRepository.findHead(threadId, ctx);
		if (head?.id !== queueItemId && (head || queueItemId)) throw new AgentTurnAlreadyRunningError();
		return { queueItem: head, predecessorId: undefined };
	}

	/** Activate only after the reservation transaction commits. */
	activateExecution(
		{ execution, needsTitleSync }: AgentExecutionReservation,
		params: StartExecutionParams,
	): void {
		this.executionControllers.set(execution.id, new AbortController());
		this.startHeartbeat(execution.id);
		this.metrics.started(execution.id, metricsSubjectOf(params));
		if (needsTitleSync) this.executionsNeedingTitleSync.add(execution.id);
		this.executionUpdateBroadcaster.notify({
			projectId: params.projectId,
			agentId: params.agentId,
			threadId: params.threadId,
			executionId: execution.id,
		});
	}

	getAbortSignal(executionId: string): AbortSignal {
		return this.executionControllers.get(executionId)?.signal ?? AbortSignal.abort();
	}

	stopExecution(executionId: string): boolean {
		const controller = this.executionControllers.get(executionId);
		if (!controller) return false;
		controller.abort(SESSION_STOPPED_REASON);
		return true;
	}

	reportUsage(
		context: AgentExecutionLogRef & { projectId: string },
		usage: AgentTokenUsage,
		duration: number,
	): void {
		this.executionUpdateBroadcaster.notify({
			projectId: context.projectId,
			agentId: context.agentId,
			threadId: context.threadId,
			executionId: context.executionId,
			duration,
			usage: {
				promptTokens: usage.promptTokens,
				completionTokens: usage.completionTokens,
				totalTokens: usage.totalTokens,
				...(usage.cost !== undefined && { cost: usage.cost }),
			},
		});
	}

	recordTimelineSnapshot({ executionId, ...snapshot }: TimelineSnapshotParams): void {
		if (!this.heartbeatTimers.has(executionId)) return;
		this.pendingTimelineSnapshots.set(executionId, snapshot);
		this.ensureTimelineSnapshotWrite(executionId);
	}

	/** Keep older snapshots behind the transaction that commits additional input. */
	async withTimelineWritesPaused<T>(executionId: string, commit: () => Promise<T>): Promise<T> {
		this.pausedTimelineSnapshots.add(executionId);
		try {
			await this.timelineSnapshotWrites.get(executionId);
			return await commit();
		} catch (error) {
			this.pendingTimelineSnapshots.delete(executionId);
			throw error;
		} finally {
			this.pausedTimelineSnapshots.delete(executionId);
			this.ensureTimelineSnapshotWrite(executionId);
		}
	}

	async finalizeExecution(executionId: string, params: RecordMessageParams): Promise<string> {
		this.stopHeartbeat(executionId);
		this.pendingTimelineSnapshots.delete(executionId);
		const record = applyFatalSessionOutcome(params.record);
		const settled = record === params.record ? params : { ...params, record };
		const status = executionStatus(settled);
		const stoppedAt = new Date(record.startTime + record.duration);
		const failureSummary = computeExecutionFailureSummary({
			timeline: record.timeline,
			status,
			error: record.error,
			stoppedAt: stoppedAt.getTime(),
		});
		const storedAt: AgentExecution['storedAt'] =
			record.timeline.length > 0 ? this.storageConfig.modeTag : 'db';

		try {
			await this.writeTerminalExecution(executionId, settled, status, stoppedAt, failureSummary);
			// Report as soon as the outcome is stored. A failed write leaves the row
			// running, and the sweep counts it as interrupted.
			this.reportFinishedExecution(settled, status);

			// Save the terminal row first. A rejected finalization must not replace a stored blob.
			await this.moveFinalTimelineToBlob(executionId, settled, storedAt);
			await this.completeRecordedExecution(settled, executionId, status);

			this.executionUpdateBroadcaster.notify({
				projectId: params.projectId,
				agentId: params.agentId,
				threadId: params.threadId,
				executionId,
				duration: record.duration,
				complete: true,
			});
			return executionId;
		} catch (error) {
			this.errorReporter.error(error);
			throw error;
		} finally {
			this.executionsNeedingTitleSync.delete(executionId);
		}
	}

	private async deleteUnreferencedTimelineBlob(
		ref: AgentExecutionLogRef,
		storedAt: StorageLocation,
	): Promise<void> {
		try {
			// The pointer update can commit before its error reaches us. Delete only after checking it.
			const currentLocation = await this.agentExecutionRepository.findTimelineStorageLocation(
				ref.executionId,
			);
			if (currentLocation === 'db' || currentLocation === null)
				await this.agentExecutionLogStore.delete([{ ...ref, storedAt }]);
		} catch (error) {
			this.errorReporter.error(error);
		}
	}

	async finalizeInterruptedExecution(
		execution: RunningAgentExecution,
		staleBefore: Date,
	): Promise<boolean> {
		const timeline = execution.timeline ?? [];
		const stoppedAt = new Date();
		const error =
			'Agent execution stopped because n8n restarted, for example after a crash or an update.';
		const duration = execution.startedAt
			? Math.max(0, stoppedAt.getTime() - execution.startedAt.getTime())
			: 0;
		const finalized = await this.txRunner.run({}, async (ctx) => {
			if (!(await this.agentExecutionThreadRepository.lockById(execution.threadId, ctx)))
				return false;
			return await this.agentExecutionRepository.updateIfRunning(
				execution.id,
				{
					status: 'interrupted',
					stoppedAt,
					duration,
					timeline: timeline.length > 0 ? timeline : null,
					storedAt: 'db',
					error,
					failureSummary: computeExecutionFailureSummary({
						timeline,
						status: 'interrupted',
						error,
						stoppedAt: stoppedAt.getTime(),
					}),
				},
				staleBefore,
				ctx,
			);
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
			this.metrics.interrupted({ agentId: thread.agentId, parentAgentId: thread.parentAgentId });
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
			void this.agentExecutionRepository
				.touchRunning(executionId)
				.then((owned) => {
					if (!owned) this.abortLostExecution(executionId);
				})
				.catch((error: unknown) => {
					this.logger.warn('Failed to heartbeat a running agent execution', {
						executionId,
						error: error instanceof Error ? error.message : String(error),
					});
				});
		}, AgentExecutionService.heartbeatIntervalMs);
		timer.unref();
		this.heartbeatTimers.set(executionId, timer);
	}

	private abortLostExecution(executionId: string): void {
		this.executionControllers
			.get(executionId)
			?.abort(new OperationalError('Agent execution ownership was lost'));
		this.stopHeartbeat(executionId);
	}

	/** A metrics failure must not fail an execution that is already stored. */
	private reportFinishedExecution(
		params: RecordMessageParams,
		status: FinishedAgentExecutionStatus,
	): void {
		try {
			this.metrics.finished(
				metricsSubjectOf(params),
				{ status, hitlStatus: params.hitlStatus },
				params.record,
			);
		} catch (error) {
			this.errorReporter.error(error);
		}
	}

	private stopHeartbeat(executionId: string): void {
		const timer = this.heartbeatTimers.get(executionId);
		if (timer) clearInterval(timer);
		this.heartbeatTimers.delete(executionId);
		this.executionControllers.delete(executionId);
		this.metrics.stopped(executionId);
	}

	private ensureTimelineSnapshotWrite(executionId: string): void {
		if (
			this.pausedTimelineSnapshots.has(executionId) ||
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
		while (!this.pausedTimelineSnapshots.has(executionId)) {
			const snapshot = this.pendingTimelineSnapshots.get(executionId);
			if (!snapshot) return;
			this.pendingTimelineSnapshots.delete(executionId);
			if (!(await this.writeTimelineSnapshot(executionId, snapshot))) return;
		}
	}

	async prepareThread(
		params: StartExecutionParams,
		ctx: OperationContext,
	): Promise<{ created: boolean; thread: AgentExecutionThread }> {
		const { thread, created } = await this.agentExecutionThreadRepository.findOrCreate(
			params.threadId,
			params.agentId,
			params.agentName,
			params.projectId,
			params.access,
			ctx,
			params.threadMetadata,
			params.taskId,
			params.taskVersionId,
			params.sessionMode,
		);
		if (!created) await this.agentExecutionThreadRepository.bumpUpdatedAt(params.threadId, ctx);
		return { created, thread };
	}

	private async completeRecordedExecution(
		params: RecordMessageParams,
		executionId: string,
		status: AgentExecution['status'],
	): Promise<void> {
		const { threadId, agentId, record } = params;
		await this.updateThreadAfterExecution(params, executionId);

		this.trackFinishedTurn(params, status);
		this.logger.debug('Recorded agent execution', {
			executionId,
			threadId,
			agentId,
			status,
			duration: record.duration,
		});
		if (this.executionsNeedingTitleSync.has(executionId)) {
			await this.syncTitleFromMemory(params);
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
	 * Store a generated title on a thread that has none, and tell the open lists.
	 * The SDK reports the title as soon as it is stored, which can be mid-turn.
	 * Best-effort: a failure must not break the turn.
	 */
	async applyGeneratedTitle(
		{ projectId, agentId, threadId }: { projectId: string; agentId: string; threadId: string },
		title: string,
		emoji: string | null,
	): Promise<void> {
		try {
			const applied = await this.agentExecutionThreadRepository.setGeneratedTitle(
				threadId,
				title,
				emoji,
			);
			if (!applied) return;
			this.executionUpdateBroadcaster.notifyThreadTitleUpdated({
				projectId,
				agentId,
				threadId,
				title,
				...(emoji && { emoji }),
			});
		} catch (error) {
			this.logger.warn('Failed to store the generated thread title', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Copy the title from the SDK memory thread to the execution thread when the
	 * execution ends. Workflow-invoked and sub-agent runs do not report titles
	 * through `onThreadTitle`, so this is their only path to the thread list. For
	 * chat turns, it retries a live title write that failed.
	 */
	private async syncTitleFromMemory(params: RecordMessageParams): Promise<void> {
		const { projectId, agentId, threadId } = params;
		let memoryThread: Thread | null;
		try {
			memoryThread = await this.n8nMemory.getImplementation(agentId).getThread(threadId);
		} catch {
			// Memory thread may not exist (agent without memory configured) — ignore
			return;
		}
		if (!memoryThread?.title) return;
		const emoji =
			memoryThread.metadata && typeof memoryThread.metadata.emoji === 'string'
				? memoryThread.metadata.emoji
				: null;
		await this.applyGeneratedTitle({ projectId, agentId, threadId }, memoryThread.title, emoji);
	}

	/**
	 * Delete a thread and all its associated runs. The FK on agent_execution
	 * cascades, so deleting the thread removes the runs in one statement.
	 * The transaction removes all database rows. External data is deleted after commit.
	 */
	async deleteThread(
		projectId: string,
		agentId: string,
		threadId: string,
		userId: string,
	): Promise<boolean> {
		const result = await this.txRunner.run({}, async (ctx) => {
			const deletion = await this.agentExecutionThreadRepository.deleteSession(
				projectId,
				agentId,
				threadId,
				userId,
				ctx,
			);
			if (!deletion) return null;
			if (deletion.status === 'busy') return deletion;

			// The memory delete removes the row that lists the bound threads, so read it first.
			const boundThreadIds = await this.integrationMessageContext.findBoundThreadIds(threadId, ctx);
			await this.n8nMemory.getImplementation(agentId).deleteThread(threadId, ctx);
			return { ...deletion, boundThreadIds };
		});
		if (!result) return false;
		if (result.status === 'busy') {
			throw new ConflictError('The session has active work and cannot be deleted');
		}
		const { refs, boundThreadIds } = result;

		// The thread is already deleted, so a failed cleanup here only leaves stale data.
		await Promise.all([
			this.agentChatAttachmentService.deleteStoredData(refs.attachmentBinaryDataIds, { threadId }),
			this.deleteThreadExecutionLogs(agentId, threadId, refs.executionLogs),
			this.clearSessionBindings(threadId, boundThreadIds),
		]);
		return true;
	}

	/**
	 * Unbinds the recipient threads that a task session messaged, so replies
	 * stop pointing at the deleted session. Runs after the commit: on SQLite a
	 * write from inside the delete transaction would wait for that transaction.
	 * If it fails, `IntegrationMessageContextService.resolveSession` ignores the
	 * stale binding and the next reply or task send clears it.
	 */
	private async clearSessionBindings(threadId: string, boundThreadIds: string[]): Promise<void> {
		if (boundThreadIds.length === 0) return;
		try {
			await this.integrationMessageContext.clearSessionBindings(threadId, boundThreadIds);
		} catch (error) {
			this.logger.warn('Failed to clear the session bindings of a deleted thread', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async deleteThreadExecutionLogs(
		agentId: string,
		threadId: string,
		executionLogs: Array<Pick<AgentExecution, 'id' | 'storedAt'>>,
	): Promise<void> {
		try {
			await this.agentExecutionLogStore.delete(
				this.toBlobRefs(executionLogs).map((ref) => ({
					agentId,
					threadId,
					executionId: ref.id,
					storedAt: ref.storedAt,
				})),
			);
		} catch (error) {
			this.logger.warn('Failed to delete agent execution logs of a deleted thread', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
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

	/** Include logs from instance agents that have sessions in the deleted project. */
	async deleteExecutionLogsForProject(projectId: string): Promise<void> {
		const refs = this.toBlobRefs(
			await this.agentExecutionRepository.findBlobRefsByProjectId(projectId),
		);
		for (const batch of chunk(refs, AgentExecutionService.logDeletionBatchSize)) {
			await this.agentExecutionLogStore.delete(
				batch.map((ref) => ({
					agentId: ref.agentId,
					threadId: ref.threadId,
					executionId: ref.id,
					storedAt: ref.storedAt,
				})),
			);
		}
	}

	/**
	 * Delete the SDK-memory threads of an agent's sessions. Call before the agent
	 * is removed: the cascade then deletes the execution threads that list them.
	 */
	async deleteMemoryThreadsForAgent(agentId: string): Promise<void> {
		const memory = this.n8nMemory.getImplementation(agentId);
		const threadIds = await this.agentExecutionThreadRepository.findIdsByAgentId(agentId);
		for (const batch of chunk(threadIds, AgentExecutionService.logDeletionBatchSize)) {
			await memory.deleteThreads(batch);
		}
	}

	/** Include instance-agent sessions before the project cascade removes their thread ids. */
	async deleteMemoryThreadsForProject(projectId: string): Promise<void> {
		const sessions =
			await this.agentExecutionThreadRepository.findMemoryThreadsForProject(projectId);
		for (const [agentId, threads] of Object.entries(
			groupBy(sessions, (session) => session.agentId),
		)) {
			const memory = this.n8nMemory.getImplementation(agentId);
			for (const batch of chunk(threads, AgentExecutionService.logDeletionBatchSize)) {
				const threadIds = batch.map((thread) => thread.id);
				await memory.deleteThreads(threadIds);
				await this.agentExecutionThreadRepository.deleteCheckpointsForThreads(threadIds);
			}
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
		userId: string,
		limit: number,
		cursor?: string,
		filters: AgentSessionQueryFilters = {},
	): Promise<{ threads: ThreadListItem[]; nextCursor: string | null }> {
		const page = await this.agentExecutionThreadRepository.findByProjectIdPaginated(
			projectId,
			agentId,
			userId,
			limit,
			cursor,
			filters,
		);

		return { ...page, threads: await this.toThreadListItems(page.threads, userId) };
	}

	/**
	 * The user's own n8n Chat threads across the given `agentIds`, newest
	 * first. The caller (`AgentsService`) has already narrowed `agentIds` to
	 * the agents the user can currently reach over n8n Chat, so a chat-only
	 * member never sees a thread under an agent they cannot talk to.
	 */
	async findN8nChatThreadsForAgents(
		userId: string,
		agentIds: string[],
		options: { limit: number; cursor?: string; search?: string },
	): Promise<AgentN8nChatThreadsResponse> {
		const { threads, nextCursor } =
			await this.agentExecutionThreadRepository.findN8nChatThreadsForOwner(
				userId,
				agentIds,
				options,
			);
		const previews = await this.findFirstMessagePreviews(threads);
		return {
			data: threads.map((thread) => toN8nChatThreadSummary(thread, previews.get(thread.id))),
			nextCursor,
		};
	}

	/**
	 * One of the user's own n8n Chat threads across the given `agentIds`
	 * (already narrowed to the agents the user can currently reach over n8n
	 * Chat). `null` when the thread doesn't exist, isn't the user's own, or
	 * falls outside `agentIds`.
	 */
	async findN8nChatThreadForAgents(
		userId: string,
		agentIds: string[],
		threadId: string,
	): Promise<AgentN8nChatThreadSummary | null> {
		const thread = await this.agentExecutionThreadRepository.findN8nChatThreadForOwner(
			userId,
			agentIds,
			threadId,
		);
		if (!thread) return null;
		const previews = await this.findFirstMessagePreviews([thread]);
		return toN8nChatThreadSummary(thread, previews.get(thread.id));
	}

	/**
	 * A short preview of the first visible user message of each thread. Thread
	 * lists show it until the thread has a title. One query for the whole page:
	 * the lists do not load the thread history.
	 */
	async findFirstMessagePreviews(
		threads: Array<Pick<AgentExecutionThread, 'id' | 'agentName'>>,
	): Promise<Map<string, string>> {
		const messages = await this.agentExecutionRepository.findFirstUserMessageByThreadIds(
			threads.map(({ id }) => id),
		);
		const previews = new Map<string, string>();
		for (const { id, agentName } of threads) {
			const preview = toFirstMessagePreview(messages.get(id) ?? null, agentName);
			if (preview) previews.set(id, preview);
		}
		return previews;
	}

	/** How many of the user's own n8n Chat threads reference each agent, for the usage sort. */
	async countN8nChatThreadsByAgent(
		userId: string,
		projectIds: string[] | null,
	): Promise<Map<string, number>> {
		return await this.agentExecutionThreadRepository.countN8nChatThreadsByAgent(userId, projectIds);
	}

	private async toThreadListItems(
		threads: AgentExecutionThread[],
		userId: string,
	): Promise<ThreadListItem[]> {
		if (threads.length === 0) return [];
		const threadIds = threads.map((t) => t.id);
		const [previews, sourceMap, failureSummaryMap, latestStatusMap] = await Promise.all([
			this.findFirstMessagePreviews(threads),
			this.agentExecutionRepository.findFirstSourceByThreadIds(threadIds),
			this.agentExecutionRepository.findFailureSummariesByThreadIds(threadIds),
			this.agentExecutionRepository.findLatestStatusesByThreadIds(threadIds),
		]);

		return threads.map((thread) => {
			const { ownerId: _ownerId, accessScope: _accessScope, owner: _owner, ...t } = thread;
			const source = sourceMap.get(t.id) ?? null;
			return {
				...t,
				canContinueInPreview: canContinueThreadInPreview(
					thread,
					userId,
					source,
					this.systemAgents.has(thread.agentId),
				),
				firstMessage: previews.get(t.id) ?? null,
				source,
				failureSummary: failureSummaryMap.get(t.id) ?? null,
				status: toSessionStatus(latestStatusMap.get(t.id)),
			};
		});
	}

	/**
	 * Get a thread with all its executions.
	 * Validates projectId and agentId ownership.
	 */
	async getThreadDetail(
		threadId: string,
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<ThreadDetail | null> {
		const thread = await this.agentExecutionThreadRepository.findOneBy({ id: threadId });
		if (!thread) return null;
		if (!threadBelongsTo(thread, projectId, agentId, userId)) return null;

		const executions = await this.agentExecutionRepository.findByThreadIdOrdered(threadId);
		await this.hydrateExecutionInputs(executions, thread.agentName, agentId);
		await this.hydrateTimelines(agentId, threadId, executions);
		return { thread, executions };
	}

	/**
	 * Get the newest `limit` turns of a thread before `before`, oldest first.
	 * Validates projectId and agentId ownership.
	 *
	 * A page never splits a continuation, such as a resume after a suspension,
	 * from the execution that it continues. The transcript merges the tool calls
	 * and the input messages of these executions, so they must load together.
	 * Thus a page can hold more than `limit` executions.
	 */
	async getThreadDetailPage(
		threadId: string,
		projectId: string,
		agentId: string,
		userId: string,
		{ limit, before }: ChatHistoryPageRequest,
	): Promise<ThreadDetailPage | null> {
		const thread = await this.agentExecutionThreadRepository.findOneBy({ id: threadId });
		if (!thread) return null;
		if (!threadBelongsTo(thread, projectId, agentId, userId)) return null;

		const rows = await this.agentExecutionRepository.findByThreadIdNewestFirst(
			threadId,
			limit + 1,
			before,
		);
		const executions = rows.slice(0, limit);
		let older: AgentExecution | undefined = rows[limit];
		// A page with older turns checks once whether its oldest turn continues the
		// next older one. Each continuation adds up to two queries, but
		// continuations are rare.
		while (older && (await this.continues(executions[executions.length - 1], older))) {
			executions.push(older);
			[older] = await this.agentExecutionRepository.findByThreadIdNewestFirst(threadId, 1, older);
		}
		executions.reverse();

		await this.hydrateExecutionInputs(executions, thread.agentName, agentId);
		await this.hydrateTimelines(agentId, threadId, executions);
		return { thread, executions, hasOlder: older !== undefined };
	}

	/**
	 * The timeline of one execution of a thread, also when it moved to blob
	 * storage. `null` when the thread has no execution with this id, or the
	 * execution has no readable timeline. Does not check access to the thread.
	 */
	async findExecutionTimeline(
		agentId: string,
		threadId: string,
		executionId: string,
	): Promise<TimelineEvent[] | null> {
		const execution = await this.agentExecutionRepository.findExecution(executionId);
		if (execution?.threadId !== threadId) return null;
		await this.hydrateTimelines(agentId, threadId, [execution]);
		return execution.timeline;
	}

	/**
	 * Whether `execution` continues `older`, the execution before it. A resume
	 * from before input messages were linked has no links, but it has the
	 * `resumed` status.
	 */
	private async continues(execution: AgentExecution, older: AgentExecution): Promise<boolean> {
		if (execution.hitlStatus === 'resumed') return true;
		return await this.messageRepository.continuesExecution(execution.id, older.id);
	}

	private async hydrateExecutionInputs(
		executions: AgentExecution[],
		agentName: string,
		agentId: string,
	): Promise<void> {
		const inputs = await this.messageRepository.findExecutionInputs(executions.map(({ id }) => id));
		// A system agent can read the resources of a message from its stored model input.
		const provider = this.systemAgents.get(agentId);
		const seen = new Set<string>();

		for (const execution of executions) {
			const messages = inputs.get(execution.id);

			if (!messages) continue;

			if (messages.some((message) => message.origin?.stopReport)) execution.stopReport = true;

			execution.inputMessageIds = messages.map(({ id }) => id);
			execution.inputMessages = [];
			for (const message of messages) {
				if (seen.has(message.id)) continue;
				seen.add(message.id);
				if (message.origin?.hidden) continue;
				const dto = this.inputMessageToDto(message, execution.id, agentName);
				if (!dto) continue;
				const references =
					message.modelContent && provider?.readMessageReferences
						? provider.readMessageReferences(message.modelContent)
						: [];
				if (references.length > 0) dto.references = references;
				execution.inputMessages.push(dto);
			}
			const parts = execution.inputMessages.flatMap(({ content }) => content);
			execution.userMessage =
				parts
					.filter((part) => part.type === 'text' && part.text)
					.map((part) => part.text)
					.join('\n') || null;
			execution.author = execution.inputMessages[0]?.author ?? null;
			execution.attachments = parts.flatMap((part) => {
				if (part.type !== 'file' || !part.fileId) return [];
				return [
					{
						id: part.fileId,
						fileName: part.fileName ?? '',
						mimeType: part.mimeType ?? 'application/octet-stream',
						sizeBytes: part.sizeBytes ?? 0,
					},
				];
			});
		}
	}

	private inputMessageToDto(message: AgentMessageEntity, executionId: string, agentName: string) {
		const dto = messageToDto({ ...message.content, id: message.id, createdAt: message.createdAt });
		if (!dto) return null;
		dto.author = message.author ?? undefined;
		dto.executionId = executionId;
		dto.content = dto.content.filter((part) => {
			if (part.type !== 'text' || part.text === undefined) return true;
			const text = cleanUserMessage(part.text, agentName);
			if (text === null) return false;
			part.text = text;
			return true;
		});
		return dto;
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

	async findAccessibleThreadById(
		threadId: string,
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<AgentExecutionThread | null> {
		return await this.agentExecutionThreadRepository.findAccessibleById(
			threadId,
			projectId,
			agentId,
			userId,
		);
	}

	async canUseDraftThread(
		threadId: string,
		projectId: string,
		agentId: string,
		userId: string,
		options: { previewChat?: boolean; sessionMode?: AgentSessionMode } = {},
	): Promise<boolean> {
		const thread = await this.findThreadById(threadId);
		if (thread) {
			if (!threadBelongsTo(thread, projectId, agentId, userId)) return false;
			if (!options.previewChat) return canUseTopLevelDraftThread(thread, userId);

			const sources = await this.agentExecutionRepository.findFirstSourceByThreadIds([threadId]);
			return canContinueThreadInPreview(
				thread,
				userId,
				sources.get(threadId),
				this.systemAgents.has(thread.agentId),
			);
		}
		if (options.sessionMode === 'existing') return false;
		return await this.canUseUnrecordedThread(threadId, agentId, draftChatMemoryResourceId(userId));
	}

	/**
	 * Classify an existing draft thread in one lookup: unusable, non-preview draft
	 * (such as task, system agent, MCP, or Instance AI), or Preview Chat.
	 * Skips the first-source query whenever the thread cannot be a Preview Chat thread.
	 */
	async classifyExistingDraftThread(
		threadId: string,
		projectId: string,
		agentId: string,
		userId: string,
	): Promise<{ usable: boolean; previewChat: boolean }> {
		const thread = await this.findThreadById(threadId);
		if (
			!thread ||
			!threadBelongsTo(thread, projectId, agentId, userId) ||
			!canUseTopLevelDraftThread(thread, userId)
		) {
			return { usable: false, previewChat: false };
		}

		if (thread.taskId !== null || this.systemAgents.has(thread.agentId)) {
			return { usable: true, previewChat: false };
		}

		const sources = await this.agentExecutionRepository.findFirstSourceByThreadIds([threadId]);

		return {
			usable: true,
			previewChat: canContinueThreadInPreview(thread, userId, sources.get(threadId), false),
		};
	}

	async canUseProductionChatThread(
		threadId: string,
		projectId: string,
		agentId: string,
		userId: string,
		sessionMode: AgentSessionMode,
	): Promise<boolean> {
		const thread = await this.findThreadById(threadId);
		if (!thread)
			return (
				sessionMode === 'new' &&
				(await this.canUseUnrecordedThread(
					threadId,
					agentId,
					productionChatMemoryResourceId(userId),
				))
			);
		if (
			thread.projectId !== projectId ||
			thread.agentId !== agentId ||
			!canUseTopLevelDraftThread(thread, userId)
		)
			return false;
		const sources = await this.agentExecutionRepository.findFirstSourceByThreadIds([threadId]);
		return canContinueThreadInN8nChat(
			thread,
			userId,
			sources.get(threadId),
			this.systemAgents.has(thread.agentId),
		);
	}

	/** A session ID without a thread is free only when no other memory scope uses it. */
	private async canUseUnrecordedThread(
		threadId: string,
		agentId: string,
		resourceId: string,
	): Promise<boolean> {
		const memory = await this.n8nMemory.getImplementation(agentId).getThread(threadId);
		if (memory && memory.resourceId !== resourceId) return false;
		return await this.checkpointStorage.hasNoConflictingThreadResource(
			agentId,
			threadId,
			resourceId,
		);
	}

	async getSessionMode(threadId: string): Promise<AgentSessionMode> {
		return (await this.findThreadById(threadId)) ? 'existing' : 'new';
	}

	/** Narrow refs to those whose data lives in a blob store, i.e. all but `db`. */
	private toBlobRefs<T extends { storedAt: AgentExecution['storedAt'] }>(refs: T[]) {
		return refs.filter((r): r is T & { storedAt: StorageLocation } => r.storedAt !== 'db');
	}

	private async writeTerminalExecution(
		executionId: string,
		params: RecordMessageParams,
		status: AgentExecutionStatus,
		stoppedAt: Date,
		failureSummary: ReturnType<typeof computeExecutionFailureSummary>,
	): Promise<void> {
		const { record, hitlStatus } = params;
		await this.timelineSnapshotWrites.get(executionId);
		// Drain in-flight side-call cost recordings before the terminal UPDATE
		// so a process exit right after finalization cannot lose side-call cost.
		const inFlight = this.sideCallUsageInFlightByExecution.get(executionId);
		if (inFlight) {
			this.sideCallUsageInFlightByExecution.delete(executionId);
			await Promise.allSettled(inFlight);
		}
		// The terminal status write and the main-loop cost increment run as one
		// atomic UPDATE (`status = ... , cost = COALESCE(cost, 0) + :costIncrement`),
		// so they commit or roll back together. Cost is applied additively rather
		// than assigned, so a side-call `incrementCost` that lands before this
		// terminal write is not overwritten. `record.totalCost` is the main-loop
		// cost only; side calls price themselves onto the same column.
		//
		// A transient failure (DB blip, deadlock) leaves the row `running`. The
		// heartbeat is already stopped at this point, so without a retry the row
		// would stay `running` until the sweeper marks it `interrupted` and the
		// main-loop cost would be lost. Retry a bounded number of times with linear
		// backoff; the total worst-case wait stays under the sweeper's 2-min grace
		// so a finalized row is never prematurely reaped. The one error that is
		// definitive — `OperationalError('Agent execution is no longer running')`
		// — means another path already finalized the row, so it is not retried.
		const terminalValues = {
			status,
			stoppedAt,
			duration: record.duration,
			model: record.model,
			promptTokens: record.usage?.promptTokens ?? null,
			completionTokens: record.usage?.completionTokens ?? null,
			totalTokens: record.usage?.totalTokens ?? null,
			cacheReadTokens: record.cacheReadTokens,
			cacheWriteTokens: record.cacheWriteTokens,
			timeline: record.timeline.length > 0 ? record.timeline : null,
			storedAt: 'db' as const,
			error: record.error,
			failureSummary,
			hitlStatus: hitlStatus ?? null,
			finishReason: record.finishReason,
			guardrailCode: record.guardrailCode,
		};
		const maxAttempts = 3;
		let lastError: unknown;
		for (let attempt = 1; attempt <= maxAttempts; attempt++) {
			try {
				const finalized = await this.txRunner.run({}, async (ctx) => {
					if (!(await this.agentExecutionThreadRepository.lockById(params.threadId, ctx)))
						return false;
					const updated = await this.agentExecutionRepository.updateIfRunning(
						executionId,
						terminalValues,
						undefined,
						ctx,
						record.totalCost ?? undefined,
					);
					if (updated && status === 'error') {
						await this.attentionFlags.flagSession(params.threadId, 'session-error', ctx);
					}
					return updated;
				});
				if (!finalized) {
					throw new OperationalError('Agent execution is no longer running', {
						extra: { executionId },
					});
				}
				return;
			} catch (error) {
				if (
					error instanceof OperationalError &&
					error.message === 'Agent execution is no longer running'
				) {
					throw error;
				}
				lastError = error;
				if (attempt < maxAttempts) {
					const delay = 100 * attempt;
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}
		throw lastError;
	}

	private async moveFinalTimelineToBlob(
		executionId: string,
		params: RecordMessageParams,
		storedAt: AgentExecution['storedAt'],
	): Promise<void> {
		if (storedAt === 'db') return;
		const { record } = params;
		const logRef = { agentId: params.agentId, threadId: params.threadId, executionId };
		let blobWritten = false;
		try {
			await this.agentExecutionLogStore.write(logRef, { timeline: record.timeline }, storedAt);
			blobWritten = true;
			await this.projectDeletion.withWritableProject(params.projectId, async (ctx) => {
				await this.agentExecutionRepository.moveTimelineToBlob(executionId, storedAt, ctx);
			});
		} catch (error) {
			this.errorReporter.error(error);
			if (blobWritten) await this.deleteUnreferencedTimelineBlob(logRef, storedAt);
		}
	}

	private async writeTimelineSnapshot(
		executionId: string,
		snapshot: Omit<TimelineSnapshotParams, 'executionId'>,
	): Promise<boolean> {
		try {
			if (
				!(await this.agentExecutionRepository.updateTimelineIfRunning(
					executionId,
					snapshot.timeline,
				))
			) {
				this.pendingTimelineSnapshots.delete(executionId);
				return false;
			}
			this.executionUpdateBroadcaster.notify({
				projectId: snapshot.projectId,
				agentId: snapshot.agentId,
				threadId: snapshot.threadId,
				executionId,
			});
		} catch (error) {
			if (!this.heartbeatTimers.has(executionId)) return false;
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
		return true;
	}

	private async updateThreadAfterExecution(
		params: RecordMessageParams,
		executionId: string,
	): Promise<void> {
		const { threadId, record, hitlStatus } = params;
		const updates: Array<Promise<unknown>> = [];
		if (hitlStatus === 'resumed' && record.model) {
			updates.push(this.backfillSuspendedExecutions(threadId, record.model));
		}
		if (record.usage) {
			updates.push(
				this.agentExecutionThreadRepository.incrementUsage(
					threadId,
					record.usage.promptTokens,
					record.usage.completionTokens,
					record.totalCost ?? 0,
					record.duration,
				),
			);
		}
		for (const result of await Promise.allSettled(updates)) {
			if (result.status === 'rejected') {
				this.logger.warn('Failed to update agent execution thread metadata', {
					executionId,
					threadId,
					error: result.reason,
				});
			}
		}
	}

	/**
	 * Apply a side-call model cost (title generation, observation-log
	 * observer/reflector, episodic-memory model calls) onto its execution row
	 * and thread totals. The SDK prices the call and sends `{ task, model,
	 * usage, cost, reportId }`; the host only adds `cost`. A report without
	 * `cost` (the model has no pricing) changes nothing. Best-effort: a
	 * failure logs a warning and never breaks the run.
	 *
	 * Both totals are updated in one transaction. Concurrent deliveries of the
	 * same `reportId` coalesce onto a single in-flight transaction so they
	 * cannot each run their own and double-count. The in-flight entry is
	 * removed when the attempt settles, so the map does not grow unbounded.
	 * The SDK calls `onSideCallUsage` once per model call with a fresh
	 * `reportId`, so a sequential replay is not expected; cross-process
	 * idempotency would need a DB-backed unique constraint, not a process-local
	 * set.
	 */
	async recordSideCallUsage(
		executionId: string,
		threadId: string,
		report: { task: string; model?: string; cost?: number; reportId: string },
	): Promise<void> {
		const { cost } = report;
		if (cost === undefined) return;
		// Register the in-flight promise synchronously (before any await) so a
		// concurrent delivery observes it and waits on the same attempt rather
		// than starting a second transaction that would double-count.
		let attempt = this.sideCallReportInFlight.get(report.reportId);
		if (attempt === undefined) {
			const created = this.applySideCallUsage(executionId, threadId, { ...report, cost });
			attempt = created;
			this.sideCallReportInFlight.set(report.reportId, created);
			let bucket = this.sideCallUsageInFlightByExecution.get(executionId);
			if (!bucket) {
				bucket = new Set();
				this.sideCallUsageInFlightByExecution.set(executionId, bucket);
			}
			bucket.add(created);
			void created.finally(() => bucket?.delete(created));
		}
		try {
			await attempt;
		} finally {
			// Only the caller that created the attempt clears the slot, so a
			// coalesced delivery does not delete a later attempt's entry.
			if (this.sideCallReportInFlight.get(report.reportId) === attempt) {
				this.sideCallReportInFlight.delete(report.reportId);
			}
		}
	}

	private async applySideCallUsage(
		executionId: string,
		threadId: string,
		report: { task: string; model?: string; cost: number; reportId: string },
	): Promise<void> {
		try {
			await this.txRunner.run({}, async (ctx) => {
				await this.agentExecutionRepository.incrementCost(executionId, report.cost, ctx);
				await this.agentExecutionThreadRepository.incrementUsage(
					threadId,
					0,
					0,
					report.cost,
					0,
					ctx,
				);
			});
		} catch (error) {
			this.logger.warn('Failed to record agent side-call usage', {
				executionId,
				threadId,
				task: report.task,
				reportId: report.reportId,
				error,
			});
		}
	}

	private trackFinishedTurn(params: RecordMessageParams, status: AgentExecutionStatus): void {
		// A parked approval is neither a success nor a failure.
		if (status === 'awaiting' || !params.telemetry) return;
		const { agentId, threadId, record } = params;
		try {
			this.agentUsageTelemetry.trackAgentTurnFinished({
				agent_id: agentId,
				user_id: params.telemetry.userId,
				thread_id: threadId,
				run_type: params.telemetry.runType,
				source: params.source,
				turn_status: status === 'success' ? 'succeeded' : 'failed',
				configuration: params.telemetry.configuration,
				...buildAgentTurnMetrics(record),
			});
		} catch (error) {
			this.logger.warn('Failed to track agent execution telemetry', {
				agentId,
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}

export function toSessionStatus(
	latestStatus: AgentExecutionStatus | undefined,
): AgentSessionStatus | null {
	if (!latestStatus) return null;
	if (latestStatus === 'success') return 'succeeded';
	return latestStatus;
}

/** Lists truncate the preview again for display. This cap only keeps the responses small. */
const FIRST_MESSAGE_PREVIEW_MAX_CHARS = 200;

function toFirstMessagePreview(message: string | null, agentName: string): string | null {
	const cleaned = cleanUserMessage(message, agentName)?.replace(/\s+/g, ' ');
	if (!cleaned) return null;
	// Cut by code points, so an emoji at the cut does not become a lone surrogate.
	const chars = Array.from(cleaned);
	if (chars.length <= FIRST_MESSAGE_PREVIEW_MAX_CHARS) return cleaned;
	return `${chars
		.slice(0, FIRST_MESSAGE_PREVIEW_MAX_CHARS - 1)
		.join('')
		.trimEnd()}…`;
}

function cleanUserMessage(message: string | null, agentName: string): string | null {
	if (message === null) return null;
	const cleaned = message
		.replace(/<@[A-Z0-9]+>/gi, `@${agentName}`)
		.replace(/@[A-Z0-9]{8,}/gi, `@${agentName}`)
		.trim();
	return cleaned.length > 0 ? cleaned : null;
}

function metricsSubjectOf(
	params: Pick<RecordMessageParams, 'agentId' | 'threadMetadata'>,
): AgentMetricsSubject {
	return { agentId: params.agentId, parentAgentId: params.threadMetadata?.parentAgentId };
}

function executionStatus(
	params: Pick<RecordMessageParams, 'record' | 'hitlStatus' | 'source'>,
): FinishedAgentExecutionStatus {
	const { record } = params;
	if (record.error !== null || record.finishReason === 'error') return 'error';
	if (record.finishReason === 'cancelled') return 'cancelled';
	if (
		params.hitlStatus === 'suspended' &&
		params.source === 'task' &&
		record.timeline.some(isApprovalSuspension)
	) {
		return 'awaiting';
	}
	return 'success';
}

function isApprovalSuspension(event: TimelineEvent): boolean {
	return (
		event.type === 'suspension' &&
		isRecord(event.suspendPayload) &&
		event.suspendPayload.type === 'approval'
	);
}

/** Maps a thread (with `agent` and `agent.activeVersion` loaded) to the
 *  cross-agent n8n Chat thread list shape. */
function toN8nChatThreadSummary(
	thread: AgentExecutionThread,
	firstMessage: string | undefined,
): AgentN8nChatThreadSummary {
	// The callers narrow `agentIds` to chat-reachable project agents.
	if (!isProjectAgent(thread.agent)) {
		throw new UnexpectedError(`Thread ${thread.id} does not belong to a project agent`);
	}
	return {
		id: thread.id,
		title: thread.title,
		firstMessage: firstMessage ?? null,
		updatedAt: thread.updatedAt.toISOString(),
		agent: { ...toAgentRef(thread.agent), projectId: thread.agent.projectId },
	};
}
