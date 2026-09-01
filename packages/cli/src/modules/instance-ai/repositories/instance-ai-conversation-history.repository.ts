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
 * fetches a multiple of what it needs. A stretch of more than factor×limit
 * consecutive invisible rows still under-fills the window, and `hasMore` then
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

export interface ConversationWindowParams {
	threadId: string;
	/** Absent for a head/tail read. */
	anchor?: ConversationWindowAnchor;
	before: number;
	after: number;
	/** The caller's real visibility check; the SQL filter is only a coarse pre-filter. */
	isVisibleRow: (row: InstanceAiMessage) => boolean;
}

export interface ConversationWindow {
	/** Oldest-first, including the anchor row when anchored. */
	rows: InstanceAiMessage[];
	hasMoreBefore: boolean;
	hasMoreAfter: boolean;
}

/** Reads backing the `conversation-history` tool, over threads and messages. */
@Service()
export class InstanceAiConversationHistoryRepository {
	constructor(private readonly dataSource: DataSource) {}

	/**
	 * Threads of one user in one project whose title, user messages, or ask-user
	 * answers match the query, most recently updated first. `total` is the match
	 * count before the limit.
	 */
	async searchProjectThreadsForUser(
		params: ConversationThreadScope & { query: string; limit: number },
	): Promise<{ rows: ConversationThreadSearchRow[]; total: number }> {
		return await this.pageByRecency(() => this.buildSearchQuery(params), params.limit);
	}

	/** The user's most recently updated threads in one project, no match filter. */
	async listRecentProjectThreadsForUser(
		params: ConversationThreadScope & { limit: number },
	): Promise<{ rows: ConversationThreadSearchRow[]; total: number }> {
		return await this.pageByRecency(() => this.scopedThreads(params), params.limit);
	}

	async threadHasMessages(threadId: string): Promise<boolean> {
		return await this.messages().where('m.threadId = :threadId', { threadId }).getExists();
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
	 * Approximate by design: it counts `LIKE`-over-JSON hits, taken before the
	 * caller's JSON-level re-check.
	 */
	async countSearchMatchesByThread(
		threadIds: string[],
		query: string,
	): Promise<Map<string, number>> {
		const counts = new Map<string, number>();
		if (threadIds.length === 0) return counts;

		const rows = await this.messages()
			.select('m.threadId', 'threadId')
			.addSelect('COUNT(*)', 'matchCount')
			.where('m.threadId IN (:...threadIds)', { threadIds })
			.andWhere(buildMessageMatchCondition('m'), {
				pattern: buildSearchLikePattern(query),
				askUserMarker: ASK_USER_CONTENT_MARKER,
			})
			.groupBy('m.threadId')
			.getRawMany<{ threadId: string; matchCount: number | string }>();

		for (const row of rows) counts.set(row.threadId, Number(row.matchCount));

		return counts;
	}

	/**
	 * Candidate rows for excerpt extraction, newest-first within each thread.
	 *
	 * One capped query per thread, so no thread can crowd another out of its
	 * candidate budget. The thread count is bounded by the tool's search limit,
	 * so this is at most a handful of small indexed queries, each stopping at
	 * `maxRowsPerThread` matches.
	 */
	async findSearchMatchRows(
		threadIds: string[],
		query: string,
		maxRowsPerThread: number,
	): Promise<Map<string, InstanceAiMessage[]>> {
		if (threadIds.length === 0 || maxRowsPerThread <= 0) return new Map();

		const buckets = await Promise.all(
			threadIds.map(async (threadId) => {
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
				return [threadId, rows] as const;
			}),
		);

		return new Map(buckets);
	}

	/**
	 * The opening user message of each thread. A correlated `MIN(createdAt)`
	 * subquery stays within what the query builder can express (window functions
	 * are not); rows tied on `createdAt` are broken by lowest id afterwards,
	 * mirroring the `(createdAt, id)` ordering the per-thread reads use.
	 */
	async findFirstUserMessages(threadIds: string[]): Promise<Map<string, InstanceAiMessage>> {
		if (threadIds.length === 0) return new Map();

		const messages = this.messages();
		const firstAt = messages
			.subQuery()
			.select('MIN(f.createdAt)')
			.from(InstanceAiMessage, 'f')
			.where('f.threadId = m.threadId')
			.andWhere("f.role = 'user'")
			.getQuery();

		const rows = await messages
			.where('m.threadId IN (:...threadIds)', { threadIds })
			.andWhere("m.role = 'user'")
			.andWhere(`m.createdAt = ${firstAt}`)
			.getMany();

		const byThread = new Map<string, InstanceAiMessage>();
		for (const row of rows) {
			const current = byThread.get(row.threadId);
			if (!current || row.id < current.id) byThread.set(row.threadId, row);
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
	async getConversationWindow(params: ConversationWindowParams): Promise<ConversationWindow> {
		const { threadId, anchor, before, after, isVisibleRow } = params;

		if (!anchor) {
			// The tool rejects `before` + `after` without an anchor, so a tail read
			// wins here if both ever arrive together.
			if (before > 0) {
				const tail = await this.fetchWindowSide(threadId, 'older', before, isVisibleRow);
				return { rows: tail.rows, hasMoreBefore: tail.hasMore, hasMoreAfter: false };
			}

			const head = await this.fetchWindowSide(threadId, 'newer', after, isVisibleRow);
			return { rows: head.rows, hasMoreBefore: false, hasMoreAfter: head.hasMore };
		}

		// The older half also carries the anchor row itself (hence `before + 1`),
		// so the anchor is fetched with the same visibility filter as the rest. An
		// anchor the predicate rejects simply frees its slot for one more older row.
		const [anchorAndOlder, newer] = await Promise.all([
			this.fetchWindowSide(threadId, 'older', before + 1, isVisibleRow, {
				anchor,
				includeAnchor: true,
			}),
			this.fetchWindowSide(threadId, 'newer', after, isVisibleRow, { anchor }),
		]);

		return {
			rows: [...anchorAndOlder.rows, ...newer.rows],
			hasMoreBefore: anchorAndOlder.hasMore,
			hasMoreAfter: newer.hasMore,
		};
	}

	/** One page of threads plus the pre-limit total. */
	private async pageByRecency(
		scope: () => SelectQueryBuilder<InstanceAiThread>,
		limit: number,
	): Promise<{ rows: ConversationThreadSearchRow[]; total: number }> {
		const threads = await scope()
			.orderBy('t.updatedAt', 'DESC')
			// Tiebreak so equal timestamps still page deterministically.
			.addOrderBy('t.id', 'DESC')
			.limit(limit)
			.getMany();
		// A partial page already proves the total; the count query — for a search,
		// a re-run of the unindexable match scan — only runs when the page is full.
		const total = threads.length < limit ? threads.length : await scope().getCount();

		return {
			rows: threads.map((thread) => ({
				id: thread.id,
				title: thread.title,
				updatedAt: thread.updatedAt,
			})),
			total,
		};
	}

	/**
	 * One user, one project, never the thread the user is in. Sub-agent threads
	 * drop out implicitly: their synthetic `instance-ai-subagent:*` resource id
	 * never equals a user id.
	 */
	private scopedThreads(scope: ConversationThreadScope): SelectQueryBuilder<InstanceAiThread> {
		return this.threads()
			.where('t.resourceId = :userId', { userId: scope.userId })
			.andWhere('t.projectId = :projectId', { projectId: scope.projectId })
			.andWhere('t.id != :excludeThreadId', { excludeThreadId: scope.excludeThreadId });
	}

	/**
	 * Scoping + match filter shared by the page and the count query. The
	 * correlated `EXISTS` keeps this a single round trip, and reuses
	 * `buildMessageMatchCondition` so what counts as a matching message stays
	 * identical across thread search, match counting, and excerpt fetching.
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
	 * rows the caller's predicate rejects do not eat window slots, and the extra
	 * row past the cap resolves `hasMore` without a second query.
	 */
	private async fetchWindowSide(
		threadId: string,
		direction: 'older' | 'newer',
		limit: number,
		isVisibleRow: (row: InstanceAiMessage) => boolean,
		boundary?: { anchor: ConversationWindowAnchor; includeAnchor?: boolean },
	): Promise<{ rows: InstanceAiMessage[]; hasMore: boolean }> {
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

		const rows: InstanceAiMessage[] = [];
		let moreVisibleFetched = false;
		for (const row of fetched) {
			if (!isVisibleRow(row)) continue;
			if (rows.length < limit) rows.push(row);
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
