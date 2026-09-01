import { Service } from '@n8n/di';
import { DataSource, Repository, type SelectQueryBuilder } from '@n8n/typeorm';

import {
	ASK_USER_CONTENT_MARKER,
	buildMessageMatchCondition,
	buildSearchLikePattern,
	buildVisibleRowCondition,
	VISIBLE_ROW_MARKERS,
} from './conversation-history-search';
import { InstanceAiMessage } from '../entities/instance-ai-message.entity';

/** The rows a human reads back: tool/system rows carry no conversation text. */
const CONVERSATION_ROLES = ['user', 'assistant'];

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
}

export interface ConversationWindow {
	/** Oldest-first, including the anchor row when anchored. */
	rows: InstanceAiMessage[];
	hasMoreBefore: boolean;
	hasMoreAfter: boolean;
}

@Service()
export class InstanceAiMessageRepository extends Repository<InstanceAiMessage> {
	constructor(dataSource: DataSource) {
		super(InstanceAiMessage, dataSource.manager);
	}

	/**
	 * Whether this instance has at least `threshold` user messages to the assistant.
	 *
	 * Instance-wide on purpose: the credit pool is per license, not per user, so "has this instance
	 * used the assistant" is the question the activation lock asks. Only `user` messages count —
	 * assistant and tool rows could exist for runs the user never initiated.
	 *
	 * Bounded by `take` rather than counting: this runs on every credits read and every run until
	 * the threshold trips, and a full count would scan a table that only grows.
	 */
	async hasAtLeastUserMessages(threshold: number): Promise<boolean> {
		if (threshold <= 0) return true;

		const rows = await this.find({
			where: { role: 'user' },
			take: threshold,
			select: { id: true },
		});

		return rows.length >= threshold;
	}

	/**
	 * Whether a thread has any persisted message at all. An existence probe,
	 * not a count — it runs on every turn, and the answer only ever
	 * distinguishes "none" from "some".
	 */
	async threadHasMessages(threadId: string): Promise<boolean> {
		return await this.existsBy({ threadId });
	}

	/**
	 * How many rows per thread match the query, in one grouped query.
	 * Approximate by design: it counts `LIKE`-over-JSON hits, which the service
	 * narrows further once it has parsed the content.
	 */
	async countSearchMatchesByThread(
		threadIds: string[],
		query: string,
	): Promise<Map<string, number>> {
		const counts = new Map<string, number>();
		if (threadIds.length === 0) return counts;

		const rows = await this.createQueryBuilder('m')
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
	 * One capped fetch across all threads keeps this plain query-builder SQL
	 * (no window functions) and bounded; the per-thread cap is applied afterwards. A thread
	 * with far more matches than its neighbours can therefore crowd the tail of
	 * the batch out, which only costs excerpts, never a hit.
	 */
	async findSearchMatchRows(
		threadIds: string[],
		query: string,
		maxRowsPerThread: number,
	): Promise<InstanceAiMessage[]> {
		if (threadIds.length === 0 || maxRowsPerThread <= 0) return [];

		const rows = await this.createQueryBuilder('m')
			.where('m.threadId IN (:...threadIds)', { threadIds })
			.andWhere(buildMessageMatchCondition('m'), {
				pattern: buildSearchLikePattern(query),
				askUserMarker: ASK_USER_CONTENT_MARKER,
			})
			.orderBy('m.threadId', 'ASC')
			.addOrderBy('m.createdAt', 'DESC')
			.addOrderBy('m.id', 'DESC')
			.take(threadIds.length * (maxRowsPerThread + 2))
			.getMany();

		const takenPerThread = new Map<string, number>();
		return rows.filter((row) => {
			const taken = takenPerThread.get(row.threadId) ?? 0;
			if (taken >= maxRowsPerThread) return false;
			takenPerThread.set(row.threadId, taken + 1);
			return true;
		});
	}

	/**
	 * The opening user message of each thread — the original ask. One query for
	 * all threads: a correlated `MIN(createdAt)` subquery stays within what the
	 * query builder can express (window functions are not). Rows tied
	 * on `createdAt` are broken by lowest id afterwards, mirroring the
	 * `(createdAt, id)` ordering the per-thread reads use.
	 */
	async findFirstUserMessages(threadIds: string[]): Promise<Map<string, InstanceAiMessage>> {
		if (threadIds.length === 0) return new Map();

		const firstAt = this.createQueryBuilder()
			.subQuery()
			.select('MIN(f.createdAt)')
			.from(InstanceAiMessage, 'f')
			.where('f.threadId = m.threadId')
			.andWhere("f.role = 'user'")
			.getQuery();

		const rows = await this.createQueryBuilder('m')
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
		const { threadId, anchor, before, after } = params;

		if (!anchor) {
			// The tool rejects `before` + `after` without an anchor, so a tail read
			// wins here if both ever arrive together.
			if (before > 0) {
				const tail = await this.fetchWindowSide(threadId, 'older', before);
				return { rows: tail.rows, hasMoreBefore: tail.hasMore, hasMoreAfter: false };
			}

			const head = await this.fetchWindowSide(threadId, 'newer', after);
			return { rows: head.rows, hasMoreBefore: false, hasMoreAfter: head.hasMore };
		}

		// The older half also carries the anchor row itself (hence `before + 1`),
		// so the anchor is fetched with the same visibility filter as the rest.
		const [anchorAndOlder, newer] = await Promise.all([
			this.fetchWindowSide(threadId, 'older', before + 1, { anchor, includeAnchor: true }),
			this.fetchWindowSide(threadId, 'newer', after, { anchor }),
		]);

		return {
			rows: [...anchorAndOlder.rows, ...newer.rows],
			hasMoreBefore: anchorAndOlder.hasMore,
			hasMoreAfter: newer.hasMore,
		};
	}

	/**
	 * One side of a window: up to `limit` visible rows older or newer than the
	 * anchor (or the thread's tail/head without one), returned oldest-first.
	 * Ordering mirrors the paging read in `TypeORMAgentMemory.listMessages`:
	 * (createdAt, id), so rows written in the same millisecond keep a stable
	 * order. One extra row is fetched to resolve `hasMore` without a second
	 * query.
	 */
	private async fetchWindowSide(
		threadId: string,
		direction: 'older' | 'newer',
		limit: number,
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
		const rows = await qb
			.orderBy('m.createdAt', sqlOrder)
			.addOrderBy('m.id', sqlOrder)
			.take(limit + 1)
			.getMany();

		const hasMore = rows.length > limit;
		if (hasMore) rows.pop();
		return { rows: direction === 'older' ? rows.reverse() : rows, hasMore };
	}

	private conversationRows(threadId: string): SelectQueryBuilder<InstanceAiMessage> {
		return this.createQueryBuilder('m')
			.where('m.threadId = :threadId', { threadId })
			.andWhere('m.role IN (:...roles)', { roles: CONVERSATION_ROLES })
			.andWhere(buildVisibleRowCondition('m'), VISIBLE_ROW_MARKERS);
	}
}
