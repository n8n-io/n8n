import type {
	InstanceAiEnsureThreadResponse,
	InstanceAiEvent,
	InstanceAiRichMessagesResponse,
	InstanceAiThreadInfo,
	InstanceAiThreadListResponse,
	InstanceAiThreadMessagesResponse,
	InstanceAiThreadOrigin,
	InstanceAiThreadSource,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import {
	buildAgentTreeFromEvents,
	createSubAgentResourceIdPrefix,
	patchThread,
	type AgentDbMessage,
	type AgentTreeSnapshot,
} from '@n8n/instance-ai';

import { DbSnapshotStorage } from './storage/db-snapshot-storage';

import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';

import type { InstanceAiCheckpoint } from './entities/instance-ai-checkpoint.entity';
import { DurableLogMetrics } from './event-bus/durable-log-metrics';
import {
	collectConfirmationRequestIds,
	markExpiredConfirmations,
	messageParserStats,
	parseStoredMessages,
} from './message-parser';
import { InstanceAiCheckpointRepository } from './repositories/instance-ai-checkpoint.repository';
import { InstanceAiEventLogRepository } from './repositories/instance-ai-event-log.repository';
import { InstanceAiPendingConfirmationRepository } from './repositories/instance-ai-pending-confirmation.repository';
import { TypeORMAgentMemory } from './storage/typeorm-agent-memory';

/** Write-path launch attribution. `unknown` is reserved for legacy rows on read. */
export interface InstanceAiThreadLaunchMetadata {
	source: InstanceAiThreadSource;
	origin: InstanceAiThreadOrigin;
	sourceContext?: Record<string, unknown>;
}

function isAgentMessageLike(value: unknown): value is AgentDbMessage {
	return (
		typeof value === 'object' &&
		value !== null &&
		typeof (value as { id?: unknown }).id === 'string' &&
		'role' in value
	);
}

function isRestorableMessage(
	value: Record<string, unknown> & { createdAt: Date },
): value is AgentDbMessage & Record<string, unknown> {
	if (typeof value.id !== 'string' || value.id.length === 0) return false;
	if (value.type === 'custom') return typeof value.data === 'object' && value.data !== null;
	return typeof value.role === 'string' && Array.isArray(value.content);
}

/** Coerce a wire-format seed message (ISO `createdAt`) into a persistable
 *  AgentDbMessage, or undefined if it fails the structural contract. */
function toRestorableMessage(value: Record<string, unknown>): AgentDbMessage | undefined {
	const rawCreatedAt = value.createdAt;
	const createdAt =
		rawCreatedAt instanceof Date
			? rawCreatedAt
			: typeof rawCreatedAt === 'string'
				? new Date(rawCreatedAt)
				: undefined;
	if (!createdAt || Number.isNaN(createdAt.getTime())) return undefined;
	const candidate = { ...value, createdAt };
	return isRestorableMessage(candidate) ? candidate : undefined;
}

function messageCreatedAtMs(message: AgentDbMessage): number {
	const at = message.createdAt;
	if (at instanceof Date) return at.getTime();
	const parsed = new Date(at).getTime();
	return Number.isNaN(parsed) ? 0 : parsed;
}

function collectInFlightCheckpointMessages(checkpoints: InstanceAiCheckpoint[]): AgentDbMessage[] {
	const merged: AgentDbMessage[] = [];
	const seen = new Set<string>();
	for (const checkpoint of checkpoints) {
		const stateMessages = checkpoint.state?.messageList?.messages ?? [];
		for (const candidate of stateMessages) {
			if (!isAgentMessageLike(candidate) || seen.has(candidate.id)) continue;
			seen.add(candidate.id);
			merged.push({
				...candidate,
				createdAt:
					candidate.createdAt instanceof Date ? candidate.createdAt : new Date(candidate.createdAt),
			});
		}
	}
	return merged;
}

function mergeMessagesById(stored: AgentDbMessage[], extras: AgentDbMessage[]): AgentDbMessage[] {
	if (extras.length === 0) return stored;
	const byId = new Map<string, AgentDbMessage>();
	for (const message of stored) byId.set(message.id, message);
	for (const message of extras) if (!byId.has(message.id)) byId.set(message.id, message);
	return [...byId.values()].sort((a, b) => messageCreatedAtMs(a) - messageCreatedAtMs(b));
}

/** Runs with a `run-start` fact but no terminal `run-finish` in the log. */
function collectUnfinishedRunIds(rows: Array<{ runId: string; event: InstanceAiEvent }>) {
	const unfinished = new Set<string>();
	for (const row of rows) {
		if (row.event.type === 'run-start') unfinished.add(row.runId);
		else if (row.event.type === 'run-finish') unfinished.delete(row.runId);
	}
	return unfinished;
}

/** Host run ids whose own checkpoint is HITL-suspended — the same predicate the
 *  interrupted-run sweeper uses to spare a run, so "keeps folding" and "won't
 *  be swept" stay one definition. Sub-agent and legacy rows carry a null
 *  hostRunId and never match. */
function collectSuspendedHostRunIds(checkpoints: InstanceAiCheckpoint[]): Set<string> {
	const suspended = new Set<string>();
	for (const checkpoint of checkpoints) {
		if (checkpoint.state?.status === 'suspended' && checkpoint.hostRunId) {
			suspended.add(checkpoint.hostRunId);
		}
	}
	return suspended;
}

/** Snapshot-shaped entries derived from the log, grouped the way the snapshot
 *  writer groups its rows: by run-start messageGroupId, else one entry per
 *  run. Events keep their thread (seq) order within each group — runs of one
 *  group can interleave (background tasks run concurrently with their parent)
 *  and the reducer must see facts in the order they happened, exactly as the
 *  run-sync bootstrap and the snapshot writer feed it. The parser pairs
 *  entries to assistant messages positionally by createdAt, so the entry is
 *  anchored at the FIRST run's last fact time (≈ parent-run end, the moment
 *  a stored snapshot row would have been created). `skippedInFlight` reports
 *  whether run/group exclusion dropped any rows, so the caller can tell an
 *  exclusion-emptied fold apart from a thread with nothing renderable. */
function buildLogDerivedSnapshots(
	rows: Array<{ runId: string; createdAt: Date; event: InstanceAiEvent }>,
	skipRunIds: Set<string>,
	skipGroupIds: Set<string>,
): { entries: AgentTreeSnapshot[]; skippedInFlight: boolean } {
	// A run's run-start is its first fact, so the run-to-group mapping is
	// complete before any grouping decision needs it.
	const groupKeyByRun = new Map<string, string>();
	for (const row of rows) {
		if (row.event.type === 'run-start') {
			const groupId = row.event.payload.messageGroupId;
			if (typeof groupId === 'string' && groupId) groupKeyByRun.set(row.runId, groupId);
		}
	}
	// An excluded run poisons its whole message group: deriving a partial tree
	// from the group's completed runs would pair it against a turn whose
	// assistant message does not exist yet — the misalignment excludeRunIds
	// exists to prevent. The in-flight turn renders via the SSE bootstrap, not
	// history. Seeded from the caller's live group ids first: an excluded run
	// whose run-start row is still in the drain queue has no mapping here, so
	// persisted rows alone cannot be trusted to identify its group.
	const skipGroupKeys = new Set<string>(skipGroupIds);
	for (const runId of skipRunIds) {
		const groupId = groupKeyByRun.get(runId);
		if (groupId) skipGroupKeys.add(groupId);
	}

	type Group = {
		runIds: string[];
		events: InstanceAiEvent[];
		messageGroupId?: string;
		/** Last fact time of the group's FIRST run — the parent-run-end moment a
		 *  stored snapshot's createdAt would carry. Background runs can finish
		 *  after LATER turns, so anchoring on the group's last fact would push
		 *  the entry past the next message and break positional pairing. */
		anchorAt: Date;
		lastAt: Date;
	};
	const groups = new Map<string, Group>();
	let skippedInFlight = false;
	for (const row of rows) {
		if (!row.runId) continue;
		const messageGroupId = groupKeyByRun.get(row.runId);
		const key = messageGroupId ?? row.runId;
		if (skipRunIds.has(row.runId) || skipGroupKeys.has(key)) {
			skippedInFlight = true;
			continue;
		}
		let group = groups.get(key);
		if (!group) {
			group = {
				runIds: [],
				events: [],
				messageGroupId,
				anchorAt: row.createdAt,
				lastAt: row.createdAt,
			};
			groups.set(key, group);
		}
		if (!group.runIds.includes(row.runId)) group.runIds.push(row.runId);
		group.events.push(row.event);
		if (row.runId === group.runIds[0] && row.createdAt > group.anchorAt) {
			group.anchorAt = row.createdAt;
		}
		if (row.createdAt > group.lastAt) group.lastAt = row.createdAt;
	}

	const entries: AgentTreeSnapshot[] = [];
	for (const group of groups.values()) {
		// Nothing renderable beyond the run lifecycle — skip, matching today's
		// behavior of not surfacing empty orphan cards.
		const hasContent = group.events.some((e) => e.type !== 'run-start' && e.type !== 'run-finish');
		if (!hasContent) continue;
		entries.push({
			tree: buildAgentTreeFromEvents(group.events),
			runId: group.runIds[group.runIds.length - 1],
			messageGroupId: group.messageGroupId,
			runIds: group.runIds,
			// Mirror the stored-snapshot row: created at parent-run end (save),
			// only updatedAt advances as later group runs complete (updateLast).
			createdAt: group.anchorAt,
			updatedAt: group.lastAt,
		});
	}
	return { entries, skippedInFlight };
}

@Service()
export class InstanceAiMemoryService {
	private readonly instanceAiConfig: InstanceAiConfig;

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		private readonly agentMemory: TypeORMAgentMemory,
		private readonly dbSnapshotStorage: DbSnapshotStorage,
		private readonly checkpointRepository: InstanceAiCheckpointRepository,
		private readonly pendingConfirmationRepository: InstanceAiPendingConfirmationRepository,
		private readonly eventLogRepository: InstanceAiEventLogRepository,
		private readonly durableLogMetrics: DurableLogMetrics,
	) {
		this.instanceAiConfig = globalConfig.instanceAi;
	}

	async listThreads(
		userId: string,
		page = 0,
		perPage = 100,
	): Promise<InstanceAiThreadListResponse> {
		const result = await this.agentMemory.listThreads({
			filter: { resourceId: userId },
			perPage,
			page,
			orderBy: { field: 'updatedAt', direction: 'DESC' },
		});
		return {
			threads: result.threads.map((t) => this.toThreadInfo(t)),
			total: result.total,
			page: result.page,
			hasMore: result.hasMore,
		};
	}

	async ensureThread(
		userId: string,
		threadId: string,
		projectId: string,
		launchMetadata: InstanceAiThreadLaunchMetadata,
	): Promise<InstanceAiEnsureThreadResponse> {
		const existing = await this.agentMemory.getThread(threadId);
		if (existing) {
			if (existing.resourceId !== userId) {
				throw new Error(`Thread ${threadId} is not owned by user ${userId}`);
			}

			return {
				thread: this.toThreadInfo(existing),
				created: false,
			};
		}

		const created = await this.agentMemory.saveThreadWithProject(
			{
				id: threadId,
				resourceId: userId,
				title: '',
				metadata: {
					source: launchMetadata.source,
					origin: launchMetadata.origin,
					...(launchMetadata.sourceContext ? { sourceContext: launchMetadata.sourceContext } : {}),
				},
			},
			projectId,
		);

		return {
			thread: this.toThreadInfo(created),
			created: true,
		};
	}

	/** Eval-only: seed a thread with a native message log (id/role/content/createdAt
	 *  preserved verbatim) so the runtime continues as if it really happened. The
	 *  thread must exist; referenced artifacts are recreated by the caller. */
	async restoreThreadMessages(
		userId: string,
		threadId: string,
		messages: Array<Record<string, unknown>>,
	): Promise<{ restored: number }> {
		const restorable: AgentDbMessage[] = [];
		for (const [index, raw] of messages.entries()) {
			const message = toRestorableMessage(raw);
			if (!message) {
				throw new BadRequestError(
					`Seed message at index ${index} is not a valid agent message (id, createdAt, and role+content or type:custom+data are required)`,
				);
			}
			restorable.push(message);
		}

		await this.agentMemory.saveMessages({ threadId, resourceId: userId, messages: restorable });
		return { restored: restorable.length };
	}

	/** Project a thread is bound to (undefined for legacy unbound threads). */
	async getThreadProjectId(threadId: string): Promise<string | undefined> {
		return (await this.agentMemory.getThreadProjectId(threadId)) ?? undefined;
	}

	async getThreadMessages(
		_userId: string,
		threadId: string,
		options?: { limit?: number; page?: number },
	): Promise<InstanceAiThreadMessagesResponse> {
		const result = await this.agentMemory.listMessages({
			threadId,
			limit: options?.limit ?? 50,
			page: options?.page ?? 0,
		});
		return {
			threadId,
			messages: result.messages.map((m) => this.toThreadMessage(m)),
		};
	}

	async getRichMessages(
		_userId: string,
		threadId: string,
		options?: {
			limit?: number;
			page?: number;
			excludeRunIds?: string[];
			/** Live in-flight group ids from run state — the durable-log fold
			 *  cannot rely on persisted run-start rows alone to map an excluded
			 *  run to its group (the row may still be in the drain queue). */
			excludeMessageGroupIds?: string[];
		},
	): Promise<Omit<InstanceAiRichMessagesResponse, 'nextEventId'>> {
		const result = await this.agentMemory.listMessages({
			threadId,
			limit: options?.limit ?? 50,
			page: options?.page ?? 0,
		});

		const loadStoredSnapshots = async (): Promise<AgentTreeSnapshot[]> => {
			let snapshots = await this.dbSnapshotStorage.getAll(threadId).catch((error) => {
				this.logger.warn('Failed to load agent tree snapshots', {
					threadId,
					error: error instanceof Error ? error.message : String(error),
				});
				return [] as AgentTreeSnapshot[];
			});
			// Exclude snapshots for active runs — they have no matching assistant
			// message in memory yet and would misalign the positional
			// snapshot-to-message matching in parseStoredMessages.
			if (options?.excludeRunIds?.length) {
				const excluded = new Set(options.excludeRunIds);
				snapshots = snapshots.filter((s) => !excluded.has(s.runId));
			}
			return snapshots;
		};

		// Loaded once, shared by the fold's suspension carve-out and the
		// in-flight message merge below.
		const activeCheckpoints = await this.loadActiveCheckpoints(threadId);

		// Durable-log flag (fold-on-read): history trees derive from the event
		// log; the stored snapshots (the flag-off and rollback path) are only
		// loaded when the fold needs its pre-log/failure fallback, keeping the
		// heaviest instance-ai table out of the flag-on hot path.
		const snapshots = this.instanceAiConfig.durableLog
			? await this.foldSnapshotsFromLog(
					threadId,
					loadStoredSnapshots,
					collectSuspendedHostRunIds(activeCheckpoints),
					options?.excludeRunIds,
					options?.excludeMessageGroupIds,
				)
			: await loadStoredSnapshots();

		// Surface the in-flight messages from any suspended checkpoint. The
		// user's prompt is persisted to memory on receipt, but the intermediate
		// assistant responses and pending tool-call from a turn suspended at HITL
		// are only committed after the turn completes, so until then they live
		// only inside the checkpoint blob. Without merging them in, a thread
		// waiting on a confirmation renders without those in-flight artifacts
		// after a page reload.
		const checkpointMessages = collectInFlightCheckpointMessages(activeCheckpoints);
		const storedMessages = mergeMessagesById(result.messages, checkpointMessages);

		const fallbacksBefore = messageParserStats.fallbackActivations;
		const messages = parseStoredMessages(storedMessages, snapshots);
		this.durableLogMetrics.notifyParserFallbacks(
			messageParserStats.fallbackActivations - fallbacksBefore,
		);
		await this.flagExpiredConfirmations(messages);

		const projectId = await this.agentMemory.getThreadProjectId(threadId);
		return { threadId, projectId: projectId ?? undefined, messages };
	}

	/**
	 * Durable-log fold-on-read: with the flag on, history agent trees derive
	 * from the event log. Stored snapshot rows keep being written (they are the
	 * flag-off and rollback path) but are neither read nor loaded here; the
	 * lazy loader runs only when the thread has no log rows or the read
	 * fails/derives nothing.
	 */
	private async foldSnapshotsFromLog(
		threadId: string,
		loadStoredSnapshots: () => Promise<AgentTreeSnapshot[]>,
		suspendedRunIds: ReadonlySet<string>,
		excludeRunIds?: string[],
		excludeMessageGroupIds?: string[],
	): Promise<AgentTreeSnapshot[]> {
		const start = Date.now();
		let rows;
		try {
			rows = await this.eventLogRepository.getForThread(threadId);
		} catch (error) {
			this.logger.warn('Failed to read Instance AI event log for history', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return await loadStoredSnapshots();
		}
		// Pre-log thread (instance ran before the flag): stored snapshots still
		// render. Production flips the flag together with the backfill migration
		// (INS-851), so this branch is a dev-instance safety, not a design.
		if (rows.length === 0) return await loadStoredSnapshots();

		// Multi-main backstop (INS-913): the caller's exclusions come from
		// per-process run state, which is empty on a main that is not driving
		// the run — the log knows main-agnostically that a run without a
		// terminal run-finish is in flight, and its group must stay out of
		// history (SSE renders it live). HITL-suspended runs are the exception:
		// they legitimately lack a run-finish and their turn folds, paired with
		// the checkpoint-surfaced messages. A crashed run stays hidden until the
		// startup sweep terminalizes it — hidden beats a forever-spinning
		// partial tree.
		const skipRunIds = new Set(excludeRunIds ?? []);
		for (const runId of collectUnfinishedRunIds(rows)) {
			if (!suspendedRunIds.has(runId)) skipRunIds.add(runId);
		}

		const { entries, skippedInFlight } = buildLogDerivedSnapshots(
			rows,
			skipRunIds,
			new Set(excludeMessageGroupIds ?? []),
		);
		if (entries.length === 0) {
			// Emptied by exclusion: the thread's only renderable content is the
			// in-flight group. Render nothing rather than fall back — the loader
			// filters stored snapshots by exact runId only, so a completed
			// sibling's snapshot would resurrect exactly the in-flight group
			// state the exclusion keeps out of history.
			if (skippedInFlight) return [];
			return await loadStoredSnapshots();
		}
		entries.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));

		this.durableLogMetrics.recordFoldRead(Date.now() - start, entries.length);
		return entries;
	}

	/** Cross-check every confirmation card against `instance_ai_pending_confirmations`
	 *  and flip `confirmation.expired = true` on the ones with no live row. */
	private async flagExpiredConfirmations(
		messages: Awaited<ReturnType<typeof parseStoredMessages>>,
	): Promise<void> {
		const requestIds = collectConfirmationRequestIds(messages);
		if (requestIds.length === 0) return;
		try {
			const live = await this.pendingConfirmationRepository.findLiveRequestIds(
				requestIds,
				new Date(),
			);
			markExpiredConfirmations(messages, live);
		} catch (error) {
			this.logger.warn('Failed to flag expired confirmation cards', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/** Live checkpoints for the thread; [] on failure — the consumers (suspension
	 *  carve-out, in-flight message merge) degrade rather than fail the read. */
	private async loadActiveCheckpoints(threadId: string): Promise<InstanceAiCheckpoint[]> {
		try {
			return await this.checkpointRepository.findActiveByThreadId(threadId);
		} catch (error) {
			this.logger.warn('Failed to load in-flight checkpoints', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
	}

	async getLatestRunSnapshot(
		threadId: string,
		options?: { messageGroupId?: string; runId?: string },
	): Promise<AgentTreeSnapshot | undefined> {
		return await this.dbSnapshotStorage.getLatest(threadId, options);
	}

	/**
	 * Verify that a thread belongs to a specific user.
	 * Returns true if the thread exists and is owned by the user.
	 */
	async validateThreadOwnership(userId: string, threadId: string): Promise<boolean> {
		return (await this.checkThreadOwnership(userId, threadId)) === 'owned';
	}

	/**
	 * Check thread ownership with three possible outcomes:
	 * - 'owned': thread exists and belongs to this user
	 * - 'not_found': thread doesn't exist yet (new conversation)
	 * - 'other_user': thread exists but belongs to someone else
	 */
	async checkThreadOwnership(
		userId: string,
		threadId: string,
	): Promise<'owned' | 'not_found' | 'other_user'> {
		const thread = await this.agentMemory.getThread(threadId);
		if (!thread) return 'not_found';
		return thread.resourceId === userId ? 'owned' : 'other_user';
	}

	async deleteThread(threadId: string): Promise<void> {
		await this.agentMemory.deleteThreadsByResourceIdPrefix(
			createSubAgentResourceIdPrefix(threadId),
		);
		await this.agentMemory.deleteThread(threadId);
	}

	/**
	 * Remove every thread owned by a user, the sub-agent threads spawned under
	 * them, and their working-memory resources. Invoked on user deletion to
	 * avoid orphaning Instance AI data. Returns the number of owner threads
	 * deleted.
	 */
	async deleteThreadsForUser(userId: string): Promise<number> {
		return await this.agentMemory.deleteThreadsByResourceId(userId);
	}

	async renameThread(threadId: string, title: string): Promise<InstanceAiThreadInfo> {
		return await this.updateThread(threadId, { title });
	}

	async updateThread(
		threadId: string,
		updates: { title?: string; metadata?: Record<string, unknown> },
	): Promise<InstanceAiThreadInfo> {
		const updated = await patchThread(this.agentMemory, {
			threadId,
			update: ({ metadata }) => {
				const patch: { title?: string; metadata: Record<string, unknown> } = {
					metadata: { ...metadata, ...updates.metadata },
				};
				if (updates.title !== undefined) {
					patch.title = updates.title;
					patch.metadata.titleRefined = true;
				}
				return patch;
			},
		});
		if (!updated) {
			throw new NotFoundError(`Thread ${threadId} not found`);
		}
		return this.toThreadInfo(updated);
	}

	async getThreadMetadata(
		userId: string,
		threadId: string,
	): Promise<Record<string, unknown> | undefined> {
		const thread = await this.agentMemory.getThread(threadId);
		if (!thread || thread.resourceId !== userId) return undefined;
		return thread.metadata;
	}

	/**
	 * Delete conversation threads older than the configured TTL. Invoked on a
	 * recurring schedule by the leader instance's prune job. Idempotent and
	 * safe to call repeatedly — no-op if threadTtlDays is 0 (disabled).
	 */
	async cleanupExpiredThreads(
		onThreadDeleted?: (threadId: string) => Promise<void>,
	): Promise<number> {
		const ttlDays = this.instanceAiConfig.threadTtlDays;
		if (!ttlDays || ttlDays <= 0) return 0;

		const cutoff = new Date(Date.now() - ttlDays * 24 * 60 * 60 * 1000);
		let deletedCount = 0;

		// Page through oldest threads first and delete expired ones.
		// Always re-fetch page 0 after deletions to avoid skipping threads
		// when items shift due to deletion during pagination.
		const perPage = 100;
		let hasMore = true;

		while (hasMore) {
			const result = await this.agentMemory.listThreads({
				perPage,
				page: 0,
				orderBy: { field: 'updatedAt', direction: 'ASC' },
			});
			let deletedInPage = 0;
			for (const thread of result.threads) {
				if (thread.updatedAt < cutoff) {
					try {
						await onThreadDeleted?.(thread.id);
						await this.deleteThread(thread.id);
						deletedCount++;
						deletedInPage++;
					} catch (error) {
						this.logger.warn('Failed to delete expired thread', {
							threadId: thread.id,
							error: error instanceof Error ? error.message : String(error),
						});
					}
				}
			}
			// If nothing was deleted on this page, we've passed the expired range
			hasMore = deletedInPage > 0 && result.hasMore;
		}

		if (deletedCount > 0) {
			this.logger.info(
				`Cleaned up ${deletedCount} expired conversation threads (TTL: ${ttlDays} days)`,
			);
		}

		return deletedCount;
	}

	private toThreadInfo(thread: {
		id: string;
		title?: string;
		resourceId: string;
		metadata?: Record<string, unknown>;
		createdAt: Date;
		updatedAt: Date;
	}): InstanceAiThreadInfo {
		return {
			id: thread.id,
			title: thread.title,
			resourceId: thread.resourceId,
			createdAt: thread.createdAt.toISOString(),
			updatedAt: thread.updatedAt.toISOString(),
			metadata: thread.metadata,
		};
	}

	private toThreadMessage(message: AgentDbMessage) {
		return {
			id: message.id,
			role: 'role' in message ? message.role : 'custom',
			content: 'content' in message ? message.content : message.data,
			type: message.type,
			createdAt: message.createdAt.toISOString(),
		};
	}
}
