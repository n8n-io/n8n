import { LIKE_ESCAPE_CLAUSE } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Repository, type SelectQueryBuilder } from '@n8n/typeorm';

import {
	ASK_USER_CONTENT_MARKER,
	buildMessageMatchCondition,
	buildSearchLikePattern,
} from './conversation-history-search';
import { InstanceAiMessage } from '../entities/instance-ai-message.entity';
import { InstanceAiThread } from '../entities/instance-ai-thread.entity';

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

@Service()
export class InstanceAiThreadRepository extends Repository<InstanceAiThread> {
	constructor(dataSource: DataSource) {
		super(InstanceAiThread, dataSource.manager);
	}

	/**
	 * Threads of one user in one project whose title, user messages, or ask-user
	 * answers match the query, most recently updated first. `total` is the
	 * match count before the limit, so the caller can say how much it left out.
	 */
	async searchProjectThreadsForUser(
		params: ConversationThreadScope & { query: string; limit: number },
	): Promise<{ rows: ConversationThreadSearchRow[]; total: number }> {
		return await this.pageByRecency(() => this.buildSearchQuery(params), params.limit);
	}

	/**
	 * The user's most recently updated threads in one project, no match filter —
	 * the query-less listing mode of the conversation-history search. Same row
	 * shape as the search so the service builds hits one way.
	 */
	async listRecentProjectThreadsForUser(
		params: ConversationThreadScope & { limit: number },
	): Promise<{ rows: ConversationThreadSearchRow[]; total: number }> {
		return await this.pageByRecency(() => this.scopedThreads(params), params.limit);
	}

	/** One page of threads plus the pre-limit total. */
	private async pageByRecency(
		scope: () => SelectQueryBuilder<InstanceAiThread>,
		limit: number,
	): Promise<{ rows: ConversationThreadSearchRow[]; total: number }> {
		const threads = await scope()
			.orderBy('t.updatedAt', 'DESC')
			// Tiebreak so equal timestamps (common in tests and bulk writes)
			// still page deterministically.
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
	 * The scoping every conversation-history read shares: one user, one project,
	 * never the thread the user is in. Sub-agent threads drop out implicitly:
	 * their synthetic `instance-ai-subagent:*` resource id never equals a user id.
	 */
	private scopedThreads(scope: ConversationThreadScope): SelectQueryBuilder<InstanceAiThread> {
		return this.createQueryBuilder('t')
			.where('t.resourceId = :userId', { userId: scope.userId })
			.andWhere('t.projectId = :projectId', { projectId: scope.projectId })
			.andWhere('t.id != :excludeThreadId', { excludeThreadId: scope.excludeThreadId });
	}

	/**
	 * Scoping + match filter shared by the page and the count query. A correlated
	 * `EXISTS` subquery keeps this a single round trip and lets the driver stop
	 * at the first matching message per thread. The message predicate is the
	 * shared `buildMessageMatchCondition`, so what counts as a matching message
	 * stays identical across thread search, match counting, and excerpt fetching.
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
}
