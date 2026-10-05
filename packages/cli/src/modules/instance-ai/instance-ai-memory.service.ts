import type { AgentDbMessage } from '@n8n/agents';
import type {
	InstanceAiEnsureThreadResponse,
	InstanceAiEvent,
	InstanceAiRichMessagesResponse,
	InstanceAiThreadInfo,
	InstanceAiThreadListResponse,
	InstanceAiThreadHistoryQuery,
	InstanceAiThreadHistoryResponse,
	InstanceAiThreadMessagesResponse,
	InstanceAiThreadOrigin,
	InstanceAiThreadSource,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig } from '@n8n/config';
import { Container, Service } from '@n8n/di';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import {
	buildAgentTreeFromEvents,
	patchThread,
	withBoundAgentTarget,
	type AgentBuilderTarget,
	type AgentTreeSnapshot,
} from '@n8n/instance-ai';

import { BadRequestError, ForbiddenError, NotFoundError } from '@n8n/errors';

import { UserRepository } from '@n8n/db';
import { isRecord } from '@n8n/utils/is-record';

import type { AgentExecutionThread } from '../agents/entities/agent-execution-thread.entity';
import { N8NCheckpointStorage } from '../agents/integrations/n8n-checkpoint-storage';
import { N8nMemory, type N8nMemoryImpl } from '../agents/integrations/n8n-memory';
import { AgentExecutionThreadRepository } from '../agents/repositories/agent-execution-thread.repository';
import { SystemAgentExecutionService } from '../agents/system-agents/system-agent-execution.service';
import { draftChatMemoryResourceId } from '../agents/utils/agent-memory-scope';
import {
	ASSISTANT_AGENT_ID,
	ASSISTANT_TURN_METADATA_KEY,
	readAssistantTurnOptions,
} from './assistant-turn-options';
import { DurableLogMetrics } from './event-bus/durable-log-metrics';
import { AUTO_FOLLOW_UP_MESSAGE } from './internal-messages';
import {
	collectConfirmationRequestIds,
	markExpiredConfirmations,
	parseStoredMessages,
} from './message-parser';
import { InstanceAiEventLogRepository } from './repositories/instance-ai-event-log.repository';

/** Write-path launch attribution. `unknown` is reserved for legacy rows on read. */
export interface InstanceAiThreadLaunchMetadata {
	source: InstanceAiThreadSource;
	origin: InstanceAiThreadOrigin;
	sourceContext?: Record<string, unknown>;
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

/** Span of a returned message page — the only trees a read needs to hydrate.
 *  Half-open (`[since, before)`) so consecutive pages partition the thread:
 *  every tree is claimed by exactly one page, none by two or by none. */
interface HistoryWindow {
	since?: Date;
	before?: Date;
}

/**
 * Bounds tree hydration to the page being rendered. Trees older than the page
 * have no message to pair with and `parseStoredMessages` renders them as
 * messages of their own, so leaving them in costs a full-history read *and*
 * puts turns on screen the page did not ask for.
 *
 * The newest page keeps an open upper bound: an in-flight run's message rows
 * are not written until its turn commits, so clipping there would hide the turn
 * the user is watching.
 *
 * An older page stops where the next page starts — NOT at its own newest
 * message. A turn's tree is written when its run ends, after the assistant row
 * it pairs with (the parser pairs a tree to the newest message at or before
 * it), so a bound at the page's own newest message drops the tree of the turn
 * the page ends on and no other page claims it either.
 *
 * An empty newest page carries no bounds at all: a thread whose only activity
 * is a first, still-running turn has no message rows yet and must still render.
 * An empty older page is out of range — nothing to pair a tree with, and no
 * bounds to read it with, so it hydrates nothing (`undefined`).
 */
function historyWindow(
	messages: AgentDbMessage[],
	page: number,
	newerBoundaryAt?: Date,
): HistoryWindow | undefined {
	if (messages.length === 0) return page === 0 ? {} : undefined;
	const since = new Date(messageCreatedAtMs(messages[0]));
	return newerBoundaryAt ? { since, before: newerBoundaryAt } : { since };
}

/**
 * Widens a windowed run set to whole message groups. A group's runs fold into
 * one tree, and a background run can outlive the turn that spawned it, so a
 * window that catches one run of a group has to pull in its siblings — folding
 * a group from half its facts yields a tree missing the other half's work.
 */
function expandRunIdsToGroups(
	runIds: string[],
	runStarts: Array<{ runId: string; messageGroupId?: string }>,
): string[] {
	const groupByRun = new Map<string, string>();
	const runsByGroup = new Map<string, string[]>();
	for (const { runId, messageGroupId } of runStarts) {
		if (!messageGroupId) continue;
		groupByRun.set(runId, messageGroupId);
		const siblings = runsByGroup.get(messageGroupId);
		if (siblings) siblings.push(runId);
		else runsByGroup.set(messageGroupId, [runId]);
	}

	const expanded = new Set(runIds);
	for (const runId of runIds) {
		const groupId = groupByRun.get(runId);
		if (!groupId) continue;
		for (const sibling of runsByGroup.get(groupId) ?? []) expanded.add(sibling);
	}
	return [...expanded];
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

/** Snapshot-shaped entries derived from the log, grouped the way the snapshot
 *  writer groups its rows: by run-start messageGroupId, else one entry per
 *  run. Events keep their thread (seq) order within each group — runs of one
 *  group can interleave (background tasks run concurrently with their parent)
 *  and the reducer must see facts in the order they happened, exactly as the
 *  run-sync bootstrap and the snapshot writer feed it. The parser pairs
 *  entries to assistant messages positionally by createdAt, so the entry is
 *  anchored at the FIRST run's last fact time (≈ parent-run end, the moment
 *  a stored snapshot row would have been created). */
function buildLogDerivedSnapshots(
	rows: Array<{ runId: string; createdAt: Date; event: InstanceAiEvent }>,
	skipRunIds: Set<string>,
	skipGroupIds: Set<string>,
): { entries: AgentTreeSnapshot[] } {
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
	for (const row of rows) {
		if (!row.runId) continue;
		const messageGroupId = groupKeyByRun.get(row.runId);
		const key = messageGroupId ?? row.runId;
		if (skipRunIds.has(row.runId) || skipGroupKeys.has(key)) continue;
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
		// A `preference-card` fact is appended by an Edit or an Undo, which can
		// happen long after the turn. It must not move the anchor: the parser
		// drops a snapshot anchored after the next conversational message, so a
		// late fact would unpair the whole turn instead of correcting one card.
		if (
			row.runId === group.runIds[0] &&
			row.event.type !== 'preference-card' &&
			row.createdAt > group.anchorAt
		) {
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
	return { entries };
}

@Service()
export class InstanceAiMemoryService {
	private readonly instanceAiConfig: InstanceAiConfig;

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		private readonly eventLogRepository: InstanceAiEventLogRepository,
		private readonly durableLogMetrics: DurableLogMetrics,
	) {
		this.instanceAiConfig = globalConfig.instanceAi;
	}

	/** Assistant memory lives in the Agents tables, scoped to the Assistant agent. */
	private get agentMemory(): N8nMemoryImpl {
		return Container.get(N8nMemory).getImplementation(ASSISTANT_AGENT_ID);
	}

	private get threads(): AgentExecutionThreadRepository {
		return Container.get(AgentExecutionThreadRepository);
	}

	private get checkpoints(): N8NCheckpointStorage {
		return Container.get(N8NCheckpointStorage);
	}

	/** Session row (owner, project, title) plus memory thread (metadata). */
	private async loadThread(threadId: string) {
		const session = await this.threads.findOneBy({ id: threadId, agentId: ASSISTANT_AGENT_ID });
		if (!session) return null;
		const memoryThread = await this.agentMemory.getThread(threadId);
		return {
			id: session.id,
			title: memoryThread?.title || session.title || undefined,
			resourceId: session.ownerId ?? '',
			projectId: session.projectId,
			metadata: memoryThread?.metadata,
			createdAt: session.createdAt,
			updatedAt: session.updatedAt,
		};
	}

	private async toThreadInfos(sessions: AgentExecutionThread[]): Promise<InstanceAiThreadInfo[]> {
		return await Promise.all(
			sessions.map(async (session) => {
				const memoryThread = await this.agentMemory.getThread(session.id);
				return this.toThreadInfo({
					id: session.id,
					title: memoryThread?.title || session.title || undefined,
					resourceId: session.ownerId ?? '',
					projectId: session.projectId,
					metadata: memoryThread?.metadata,
					createdAt: session.createdAt,
					updatedAt: session.updatedAt,
				});
			}),
		);
	}

	/** Paged message read over the Assistant memory, oldest first within the page. */
	private async listMessages(args: {
		threadId: string;
		limit?: number;
		page?: number;
		withNewerBoundary?: boolean;
	}): Promise<{ messages: AgentDbMessage[]; newerBoundaryAt?: Date }> {
		const limit = args.limit ?? 50;
		const page = args.page ?? 0;
		const all = await this.agentMemory.getMessages(args.threadId);
		const end = all.length - page * limit;
		if (end <= 0) return { messages: [] };
		const start = Math.max(0, end - limit);
		const boundary = args.withNewerBoundary && page > 0 ? all[end] : undefined;
		return { messages: all.slice(start, end), newerBoundaryAt: boundary?.createdAt };
	}

	async getThreadInfo(threadId: string): Promise<InstanceAiThreadInfo> {
		const thread = await this.loadThread(threadId);
		if (!thread) throw new NotFoundError('Thread not found');
		return this.toThreadInfo(thread);
	}

	async listThreadHistory(
		userId: string,
		query: InstanceAiThreadHistoryQuery,
	): Promise<InstanceAiThreadHistoryResponse> {
		let before: { updatedAt: Date; id: string } | undefined;
		if (query.cursor) {
			try {
				const parsed = z
					.object({ updatedAt: z.string().datetime(), id: z.string().min(1).max(256) })
					.parse(JSON.parse(Buffer.from(query.cursor, 'base64url').toString('utf8')));
				before = { updatedAt: new Date(parsed.updatedAt), id: parsed.id };
			} catch {
				throw new BadRequestError('Invalid thread history cursor');
			}
		}
		const rows = await this.threads.findOwnedHistoryPage(
			ASSISTANT_AGENT_ID,
			userId,
			query.limit,
			query.search,
			before,
		);
		const hasMore = rows.length > query.limit;
		const threads = await this.toThreadInfos(rows.slice(0, query.limit));
		const last = threads.at(-1);
		return {
			threads,
			hasMore,
			nextCursor:
				hasMore && last
					? Buffer.from(JSON.stringify({ updatedAt: last.updatedAt, id: last.id })).toString(
							'base64url',
						)
					: null,
		};
	}

	async listThreads(
		userId: string,
		page = 0,
		perPage = 100,
	): Promise<InstanceAiThreadListResponse> {
		const all = await this.threads.findOwnedByAgent(ASSISTANT_AGENT_ID, userId);
		const slice = all.slice(page * perPage, (page + 1) * perPage);
		return {
			threads: await this.toThreadInfos(slice),
			total: all.length,
			page,
			hasMore: (page + 1) * perPage < all.length,
		};
	}

	async ensureThread(
		userId: string,
		threadId: string,
		projectId: string,
		launchMetadata: InstanceAiThreadLaunchMetadata,
		title = '',
	): Promise<InstanceAiEnsureThreadResponse> {
		const existing = await this.loadThread(threadId);
		if (existing) {
			if (existing.resourceId !== userId) {
				throw new Error(`Thread ${threadId} is not owned by user ${userId}`);
			}
			return { thread: this.toThreadInfo(existing), created: false };
		}
		const user = await Container.get(UserRepository).findByIdWithRole(userId);
		if (!user) throw new NotFoundError('User not found');
		await Container.get(SystemAgentExecutionService).createThread({
			agentId: ASSISTANT_AGENT_ID,
			user,
			projectId,
			threadId,
			...(title ? { title } : {}),
		});
		await this.agentMemory.saveThread({
			id: threadId,
			resourceId: draftChatMemoryResourceId(userId),
			title,
			metadata: {
				source: launchMetadata.source,
				origin: launchMetadata.origin,
				...(launchMetadata.sourceContext ? { sourceContext: launchMetadata.sourceContext } : {}),
			},
		});
		const created = await this.loadThread(threadId);
		if (!created) throw new NotFoundError('Thread not found');
		return { thread: this.toThreadInfo(created), created: true };
	}

	/**
	 * Store an assistant greeting before any user turn (onboarding). The model API
	 * needs a user message first, so a hidden auto-follow-up turn precedes the
	 * greeting; the message parser drops that turn from the UI. `hiddenUserText`
	 * replaces the auto-follow-up text when the hidden turn carries context for
	 * the model (the onboarding answers). Returns the id of that hidden turn.
	 */
	async seedOpeningMessages(
		threadId: string,
		userId: string,
		greeting: string,
		hiddenUserText: string = AUTO_FOLLOW_UP_MESSAGE,
	): Promise<{ userMessageId: string }> {
		// Both stamps stay in the past: event rows written right after this must
		// not sort before the greeting, or the fold shows the greeting twice.
		const now = Date.now();
		const userMessageId = randomUUID();
		await this.agentMemory.saveMessages({
			threadId,
			resourceId: draftChatMemoryResourceId(userId),
			messages: [
				{
					id: userMessageId,
					createdAt: new Date(now - 1),
					type: 'llm',
					role: 'user',
					content: [{ type: 'text', text: hiddenUserText }],
				},
				{
					id: randomUUID(),
					createdAt: new Date(now),
					type: 'llm',
					role: 'assistant',
					content: [{ type: 'text', text: greeting }],
				},
			],
		});
		return { userMessageId };
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

		await this.agentMemory.saveMessages({
			threadId,
			resourceId: draftChatMemoryResourceId(userId),
			messages: restorable,
		});
		return { restored: restorable.length };
	}

	async getThreadProjectId(threadId: string): Promise<string | undefined> {
		return (await this.loadThread(threadId))?.projectId;
	}

	async getThreadMessages(
		_userId: string,
		threadId: string,
		options?: { limit?: number; page?: number },
	): Promise<InstanceAiThreadMessagesResponse> {
		const result = await this.listMessages({
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
		const page = options?.page ?? 0;
		const result = await this.listMessages({
			threadId,
			limit: options?.limit ?? 50,
			page,
			// The next page's first message is this page's upper bound.
			withNewerBoundary: true,
		});

		// Hydrate trees only for the page we are about to render.
		const pageWindow = historyWindow(result.messages, page, result.newerBoundaryAt);

		// The fold's suspension carve-out: a HITL-suspended run legitimately has
		// no run-finish, so its turn still folds (the confirmation card and the
		// in-flight work are durable facts) instead of being skipped as in-flight.
		const suspendedRunIds = await this.loadSuspendedRunIds(threadId);

		// No window means an out-of-range older page: it has no message rows for
		// a tree to pair with, and hydrating it unbounded would read the whole
		// thread to render nothing.
		//
		// Fold-on-read: history trees derive from the event log.
		const snapshots = !pageWindow
			? []
			: await this.foldSnapshotsFromLog(
					threadId,
					suspendedRunIds,
					pageWindow,
					options?.excludeRunIds,
					options?.excludeMessageGroupIds,
				);

		const messages = parseStoredMessages(result.messages, snapshots);
		await this.flagExpiredConfirmations(threadId, messages);

		const projectId = await this.getThreadProjectId(threadId);
		return { threadId, projectId, messages };
	}

	/**
	 * Fold-on-read: history agent trees derive from the event log.
	 *
	 * Only the runs behind the requested page are read and folded, so a long
	 * thread costs the same per read as a short one. Run-start facts are
	 * read for the whole thread — one row per run, no group can be resolved
	 * without them — but their payloads are the only ones parsed outside the
	 * window.
	 */
	private async foldSnapshotsFromLog(
		threadId: string,
		suspendedRunIds: ReadonlySet<string>,
		pageWindow: HistoryWindow,
		excludeRunIds?: string[],
		excludeMessageGroupIds?: string[],
	): Promise<AgentTreeSnapshot[]> {
		const start = Date.now();
		let rows;
		try {
			const runStarts = await this.eventLogRepository.getRunStarts(threadId);
			if (runStarts.length === 0) return [];

			const windowedRunIds = await this.eventLogRepository.findRunIdsInWindow(threadId, pageWindow);
			rows = await this.eventLogRepository.getForThreadRuns(
				threadId,
				expandRunIdsToGroups(windowedRunIds, runStarts),
			);
		} catch (error) {
			// Degrade to messages-without-trees rather than failing the page read.
			this.logger.warn('Failed to read Instance AI event log for history', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return [];
		}
		if (rows.length === 0) return [];

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

		const { entries } = buildLogDerivedSnapshots(
			rows,
			skipRunIds,
			new Set(excludeMessageGroupIds ?? []),
		);
		if (entries.length === 0) return [];
		entries.sort((a, b) => (a.createdAt?.getTime() ?? 0) - (b.createdAt?.getTime() ?? 0));

		this.durableLogMetrics.recordFoldRead(Date.now() - start, entries.length);
		return entries;
	}

	async flagExpiredConfirmations(
		threadId: string,
		messages: Parameters<typeof markExpiredConfirmations>[0],
	): Promise<void> {
		const requestIds = collectConfirmationRequestIds(messages);
		if (requestIds.length === 0) return;
		try {
			// A card is live while the suspended Agents checkpoint still waits for it.
			markExpiredConfirmations(messages, await this.loadLiveRequestIds(threadId));
		} catch (error) {
			this.logger.warn('Failed to flag expired confirmation cards', {
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	private async loadSuspendedCheckpoint(threadId: string) {
		try {
			return await this.checkpoints.findSuspendedForThread(ASSISTANT_AGENT_ID, threadId);
		} catch (error) {
			this.logger.warn('Failed to load the suspended checkpoint', {
				threadId,
				error: error instanceof Error ? error.message : String(error),
			});
			return null;
		}
	}

	/** Run ids of the suspended turn. Its run has no run-finish, but its card is a durable fact. */
	private async loadSuspendedRunIds(threadId: string): Promise<Set<string>> {
		const checkpoint = await this.loadSuspendedCheckpoint(threadId);
		const options = readAssistantTurnOptions(
			checkpoint?.persistence?.hostMetadata?.[ASSISTANT_TURN_METADATA_KEY],
		);
		return new Set(options.runId ? [options.runId] : []);
	}

	async loadLiveRequestIds(threadId: string): Promise<Set<string>> {
		const checkpoint = await this.loadSuspendedCheckpoint(threadId);
		const live = new Set<string>();
		// The seeded onboarding card waits in thread metadata, not in a checkpoint.
		const onboardingCard = (await this.agentMemory.getThread(threadId))?.metadata?.onboardingCard;
		if (isRecord(onboardingCard) && typeof onboardingCard.requestId === 'string') {
			live.add(onboardingCard.requestId);
		}
		for (const toolCall of Object.values(checkpoint?.pendingToolCalls ?? {})) {
			if (
				toolCall.suspended &&
				isRecord(toolCall.suspendPayload) &&
				typeof toolCall.suspendPayload.requestId === 'string'
			) {
				live.add(toolCall.suspendPayload.requestId);
			}
		}
		return live;
	}

	/**
	 * Verify that a thread belongs to a specific user.
	 * Returns true if the thread exists and is owned by the user.
	 */
	async validateThreadOwnership(userId: string, threadId: string): Promise<boolean> {
		return (await this.checkThreadOwnership(userId, threadId)) === 'owned';
	}

	async checkThreadOwnership(
		userId: string,
		threadId: string,
	): Promise<'owned' | 'not_found' | 'other_user'> {
		const session = await this.threads.findOneBy({ id: threadId });
		if (!session) return 'not_found';
		return session.agentId === ASSISTANT_AGENT_ID && session.ownerId === userId
			? 'owned'
			: 'other_user';
	}

	async deleteThread(threadId: string): Promise<void> {
		await this.agentMemory.deleteThread(threadId);
		await this.threads.delete({ id: threadId, agentId: ASSISTANT_AGENT_ID });
	}

	async deleteThreadsForUser(userId: string): Promise<number> {
		const sessions = await this.threads.findOwnedByAgent(ASSISTANT_AGENT_ID, userId);
		for (const session of sessions) await this.deleteThread(session.id);
		return sessions.length;
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
		if (updates.title !== undefined) {
			await this.threads.updateOwned(threadId, { title: updates.title });
		}
		return await this.getThreadInfo(threadId);
	}

	/**
	 * Replace this thread's pending new-agent marker with `target` as its bound
	 * agent-builder target, in one patch — a merge-style update cannot delete a
	 * key, and leaving both standing makes a reload show a phantom blank artifact
	 * beside the real agent. Ownership is re-checked inside the patch so a thread
	 * that changed hands between read and write cannot be rebound.
	 */
	async bindAgentBuilderTarget(
		userId: string,
		threadId: string,
		target: AgentBuilderTarget,
	): Promise<InstanceAiThreadInfo> {
		const updated = await patchThread(this.agentMemory, {
			threadId,
			update: (thread) => {
				// A `null` patch means "leave the thread alone", which would answer a
				// non-owner with a success — throw instead.
				if (thread.resourceId !== draftChatMemoryResourceId(userId)) {
					throw new ForbiddenError('Not authorized for this thread');
				}
				return { metadata: withBoundAgentTarget(thread.metadata ?? {}, target) };
			},
		});
		if (!updated) {
			throw new NotFoundError(`Thread ${threadId} not found`);
		}
		return await this.getThreadInfo(updated.id);
	}

	async getThreadMetadata(
		userId: string,
		threadId: string,
	): Promise<Record<string, unknown> | undefined> {
		const thread = await this.loadThread(threadId);
		if (!thread || thread.resourceId !== userId) return undefined;
		return thread.metadata;
	}

	/**
	 * Delete conversation threads older than the configured TTL. Invoked on a
	 * recurring schedule by the leader instance's prune job. Idempotent and
	 * safe to call repeatedly — no-op if threadTtlDays is 0 (disabled). Stops
	 * before the next thread once `signal` aborts.
	 */
	async cleanupExpiredThreads(
		onThreadDeleted?: (threadId: string) => Promise<void>,
		signal?: AbortSignal,
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

		while (hasMore && !signal?.aborted) {
			const expired = await this.threads.findByAgentUpdatedBefore(
				ASSISTANT_AGENT_ID,
				cutoff,
				perPage,
			);
			const result = { threads: expired, hasMore: expired.length === perPage };
			let deletedInPage = 0;
			for (const thread of result.threads) {
				if (signal?.aborted) break;
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
		projectId?: string;
		metadata?: Record<string, unknown>;
		createdAt: Date;
		updatedAt: Date;
	}): InstanceAiThreadInfo {
		return {
			id: thread.id,
			title: thread.title,
			resourceId: thread.resourceId,
			...(thread.projectId ? { projectId: thread.projectId } : {}),
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
