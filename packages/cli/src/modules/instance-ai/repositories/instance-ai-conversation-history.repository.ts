import { LIKE_ESCAPE_CLAUSE } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type SelectQueryBuilder } from '@n8n/typeorm';

import {
	ASK_USER_CONTENT_MARKER,
	buildMessageMatchCondition,
	buildSearchLikePattern,
	buildVisibleRowCondition,
	VISIBLE_ROW_MARKERS,
} from './conversation-history-search';
import { InstanceAiMessage } from '../entities/instance-ai-message.entity';
import { InstanceAiThread } from '../entities/instance-ai-thread.entity';

/** The rows a human reads back: tool/system rows carry no conversation text. */
const CONVERSATION_ROLES = ['user', 'assistant'];

/**
 * Rows that pass the SQL pre-filter can still be invisible to the reader
 * (internal auto-follow-ups, unreadable content), so each side of a window
 * fetches a multiple of what it needs. The window under-fills only when fewer
 * than `limit` of the fetched rows are visible, and `hasMore` then
 * over-reports (one wasted follow-up read) — it never under-reports.
 */
const WINDOW_OVERFETCH_FACTOR = 4;

export interface ConversationThreadSearchRow {
	id: string;
	title: string;
	updatedAt: Date;
}

export interface ConversationThreadScope {
	userId: string;
	projectId: string;
	/** The thread the user is in right now — never a search result. */
	excludeThreadId: string;
}

/** Anchor position of a conversation window, ordered by (createdAt, id). */
export interface ConversationWindowAnchor {
	createdAt: Date;
	id: string;
}

export interface ConversationWindowParams<T> {
	threadId: string;
	/** Absent for a head/tail read. */
	anchor?: ConversationWindowAnchor;
	before: number;
	after: number;
	/**
	 * Maps a fetched row to what the window returns, or `undefined` to drop it.
	 * The SQL filter is only a coarse pre-filter.
	 */
	project: (row: InstanceAiMessage) => T | undefined;
}

export interface ConversationWindow<T> {
	/** Oldest-first, including the anchor row when anchored. */
	rows: T[];
	hasMoreBefore: boolean;
	hasMoreAfter: boolean;
}

/** Reads backing the `conversation-history` tool, over threads and messages. */
@Service()
export class InstanceAiConversationHistoryRepository {
	constructor(private readonly dataSource: DataSource) {}

	/**
	 * Threads of one user in one project whose title, user messages, or ask-user
	 * answers match the query, most recently updated first. No total: the caller
	 * verifies these rows and drops the false positives, so any count taken here
	 * would be wrong by the time it is read.
	 */
	async searchProjectThreadsForUser(
		params: ConversationThreadScope & { query: string; limit: number },
	): Promise<ConversationThreadSearchRow[]> {
		return await this.pageByRecency(() => this.buildSearchQuery(params), params.limit);
	}

	/** The user's most recently updated threads in one project, no match filter. */
	async listRecentProjectThreadsForUser(
		params: ConversationThreadScope & { limit: number },
	): Promise<ConversationThreadSearchRow[]> {
		return await this.pageByRecency(() => this.scopedThreads(params), params.limit);
	}

	/** Exact count of the threads `listRecentProjectThreadsForUser` pages over. */
	async countProjectThreadsForUser(scope: ConversationThreadScope): Promise<number> {
		return await this.scopedThreads(scope).getCount();
	}

	/** Ownership is part of the query, so a foreign thread reads as missing. */
	async findOwnedThread(
		threadId: string,
		userId: string,
		projectId: string,
	): Promise<InstanceAiThread | null> {
		return await this.threads()
			.where('t.id = :threadId', { threadId })
			.andWhere('t.resourceId = :userId', { userId })
			.andWhere('t.projectId = :projectId', { projectId })
			.getOne();
	}

	/**
	 * Candidate rows for excerpt extraction, newest-first within each thread.
	 *
	 * One capped query per thread, so no thread can crowd another out of its
	 * candidate budget. The thread count is bounded by the tool's search limit,
	 * so this is at most a handful of small indexed queries, each stopping at
	 * `maxRowsPerThread` matches. They run one at a time: the default Postgres
	 * pool holds two connections, and a concurrent burst would occupy both.
	 */
	async findSearchMatchRows(
		threadIds: string[],
		query: string,
		maxRowsPerThread: number,
	): Promise<Map<string, InstanceAiMessage[]>> {
		const byThread = new Map<string, InstanceAiMessage[]>();
		if (maxRowsPerThread <= 0) return byThread;

		for (const threadId of threadIds) {
			const rows = await this.messages()
				.where('m.threadId = :threadId', { threadId })
				.andWhere(buildMessageMatchCondition('m'), {
					pattern: buildSearchLikePattern(query),
					askUserMarker: ASK_USER_CONTENT_MARKER,
				})
				.orderBy('m.createdAt', 'DESC')
				.addOrderBy('m.id', 'DESC')
				.take(maxRowsPerThread)
				.getMany();
			byThread.set(threadId, rows);
		}
		return byThread;
	}

	/**
	 * The opening user message of each thread, by the `(createdAt, id)` order the
	 * per-thread reads use. One `take(1)` query per thread, sequential like
	 * {@link findSearchMatchRows}: a correlated `MIN` goes quadratic on long threads.
	 */
	async findFirstUserMessages(threadIds: string[]): Promise<Map<string, InstanceAiMessage>> {
		const byThread = new Map<string, InstanceAiMessage>();
		for (const threadId of threadIds) {
			const row = await this.messages()
				.where('m.threadId = :threadId', { threadId })
				.andWhere("m.role = 'user'")
				.orderBy('m.createdAt', 'ASC')
				.addOrderBy('m.id', 'ASC')
				.take(1)
				.getOne();
			if (row) byThread.set(threadId, row);
		}
		return byThread;
	}

	/**
	 * Anchor lookup for a windowed read. Restricted to the rows a window can
	 * show, so an id that exists but can never appear in one reads as "not
	 * found" instead of yielding an anchor the window then drops.
	 */
	async findMessageInThread(
		threadId: string,
		messageId: string,
	): Promise<InstanceAiMessage | null> {
		return await this.conversationRows(threadId)
			.andWhere('m.id = :messageId', { messageId })
			.getOne();
	}

	/**
	 * A window of conversation rows, oldest-first.
	 *
	 * Without an anchor this is a tail read (`before` newest rows) or, when only
	 * `after` is asked for, a head read. With an anchor it is the anchor row plus
	 * up to `before` older and `after` newer rows.
	 */
	async getConversationWindow<T>(
		params: ConversationWindowParams<T>,
	): Promise<ConversationWindow<T>> {
		const { threadId, anchor, before, after, project } = params;

		if (!anchor) {
			// The tool rejects `before` + `after` without an anchor, so a tail read
			// wins here if both ever arrive together.
			if (before > 0) {
				const tail = await this.fetchWindowSide(threadId, 'older', before, project);
				return { rows: tail.rows, hasMoreBefore: tail.hasMore, hasMoreAfter: false };
			}

			const head = await this.fetchWindowSide(threadId, 'newer', after, project);
			return { rows: head.rows, hasMoreBefore: false, hasMoreAfter: head.hasMore };
		}

		// The older half also carries the anchor row itself (hence `before + 1`),
		// so the anchor is fetched with the same visibility filter as the rest. An
		// anchor the projector drops simply frees its slot for one more older row.
		const [anchorAndOlder, newer] = await Promise.all([
			this.fetchWindowSide(threadId, 'older', before + 1, project, {
				anchor,
				includeAnchor: true,
			}),
			this.fetchWindowSide(threadId, 'newer', after, project, { anchor }),
		]);

		return {
			rows: [...anchorAndOlder.rows, ...newer.rows],
			hasMoreBefore: anchorAndOlder.hasMore,
			hasMoreAfter: newer.hasMore,
		};
	}

	/** One page of threads, most recently updated first. */
	private async pageByRecency(
		scope: () => SelectQueryBuilder<InstanceAiThread>,
		limit: number,
	): Promise<ConversationThreadSearchRow[]> {
		const threads = await scope()
			.orderBy('t.updatedAt', 'DESC')
			// Tiebreak so equal timestamps still page deterministically.
			.addOrderBy('t.id', 'DESC')
			.limit(limit)
			.getMany();

		return threads.map((thread) => ({
			id: thread.id,
			title: thread.title,
			updatedAt: thread.updatedAt,
		}));
	}

	/**
	 * One user, one project, never the current thread, and only threads that
	 * hold a message (the client creates the thread row before the first send).
	 * Sub-agent threads drop out implicitly: their synthetic
	 * `instance-ai-subagent:*` resource id never equals a user id.
	 */
	private scopedThreads(scope: ConversationThreadScope): SelectQueryBuilder<InstanceAiThread> {
		const qb = this.threads();
		const hasMessages = qb
			.subQuery()
			.select('1')
			.from(InstanceAiMessage, 'started')
			.where('started.threadId = t.id')
			.getQuery();

		return qb
			.where('t.resourceId = :userId', { userId: scope.userId })
			.andWhere('t.projectId = :projectId', { projectId: scope.projectId })
			.andWhere('t.id != :excludeThreadId', { excludeThreadId: scope.excludeThreadId })
			.andWhere(`EXISTS ${hasMessages}`);
	}

	/**
	 * Scoping + match filter. The correlated `EXISTS` keeps this a single round
	 * trip, and reuses `buildMessageMatchCondition` so what counts as a matching
	 * message stays identical across thread search and excerpt fetching.
	 */
	private buildSearchQuery(
		params: ConversationThreadScope & { query: string },
	): SelectQueryBuilder<InstanceAiThread> {
		const qb = this.scopedThreads(params);

		const messageMatch = qb
			.subQuery()
			.select('1')
			.from(InstanceAiMessage, 'm')
			.where('m.threadId = t.id')
			.andWhere(buildMessageMatchCondition('m'))
			.getQuery();

		return qb
			.andWhere(`(LOWER(t.title) LIKE :pattern ${LIKE_ESCAPE_CLAUSE} OR EXISTS ${messageMatch})`)
			.setParameters({
				pattern: buildSearchLikePattern(params.query),
				askUserMarker: ASK_USER_CONTENT_MARKER,
			});
	}

	/**
	 * One side of a window: up to `limit` visible rows older or newer than the
	 * anchor (or the thread's tail/head without one), returned oldest-first.
	 * Ordering mirrors the paging read in `TypeORMAgentMemory.listMessages`:
	 * (createdAt, id), so rows written in the same millisecond keep a stable
	 * order. The fetch is over-sized (see {@link WINDOW_OVERFETCH_FACTOR}) so
	 * rows the projector drops do not eat window slots, and the extra row past
	 * the cap resolves `hasMore` without a second query.
	 */
	private async fetchWindowSide<T>(
		threadId: string,
		direction: 'older' | 'newer',
		limit: number,
		project: (row: InstanceAiMessage) => T | undefined,
		boundary?: { anchor: ConversationWindowAnchor; includeAnchor?: boolean },
	): Promise<{ rows: T[]; hasMore: boolean }> {
		const qb = this.conversationRows(threadId);
		if (boundary) {
			const timeOp = direction === 'older' ? '<' : '>';
			const idOp = direction === 'older' ? (boundary.includeAnchor ? '<=' : '<') : '>';
			qb.andWhere(
				`(m.createdAt ${timeOp} :anchorAt OR (m.createdAt = :anchorAt AND m.id ${idOp} :anchorId))`,
				{ anchorAt: boundary.anchor.createdAt, anchorId: boundary.anchor.id },
			);
		}

		const sqlOrder = direction === 'older' ? 'DESC' : 'ASC';
		const fetchLimit = limit * WINDOW_OVERFETCH_FACTOR + 1;
		const fetched = await qb
			.orderBy('m.createdAt', sqlOrder)
			.addOrderBy('m.id', sqlOrder)
			.take(fetchLimit)
			.getMany();

		const rows: T[] = [];
		let moreVisibleFetched = false;
		for (const row of fetched) {
			const item = project(row);
			if (item === undefined) continue;
			if (rows.length < limit) rows.push(item);
			else {
				moreVisibleFetched = true;
				break;
			}
		}

		// Exact when the fetch saw the side's end; when it was truncated the
		// remainder is unknown, so report true — over-reporting costs one empty
		// follow-up read, under-reporting would hide messages.
		const hasMore = moreVisibleFetched || fetched.length === fetchLimit;
		return { rows: direction === 'older' ? rows.reverse() : rows, hasMore };
	}

	private conversationRows(threadId: string): SelectQueryBuilder<InstanceAiMessage> {
		return this.messages()
			.where('m.threadId = :threadId', { threadId })
			.andWhere('m.role IN (:...roles)', { roles: CONVERSATION_ROLES })
			.andWhere(buildVisibleRowCondition('m'), VISIBLE_ROW_MARKERS);
	}

	private threads(): SelectQueryBuilder<InstanceAiThread> {
		return this.dataSource.createQueryBuilder(InstanceAiThread, 't');
	}

	private messages(): SelectQueryBuilder<InstanceAiMessage> {
		return this.dataSource.createQueryBuilder(InstanceAiMessage, 'm');
	}
}
