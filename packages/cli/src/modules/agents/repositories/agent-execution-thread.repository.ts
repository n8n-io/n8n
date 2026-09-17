import type { AgentSessionOrigin, AgentSessionQueryFilters } from '@n8n/api-types';
import { Service } from '@n8n/di';
import { DataSource, Repository, type SelectQueryBuilder } from '@n8n/typeorm';

import { AgentExecution } from '../entities/agent-execution.entity';
import { AgentExecutionThread } from '../entities/agent-execution-thread.entity';

const SESSION_NUMBER_RETRY_ATTEMPTS = 3;

export interface AgentExecutionThreadMetadata {
	parentThreadId?: string;
	parentAgentId?: string;
}

export interface AgentExecutionThreadPage {
	threads: AgentExecutionThread[];
	nextCursor: string | null;
}

@Service()
export class AgentExecutionThreadRepository extends Repository<AgentExecutionThread> {
	constructor(dataSource: DataSource) {
		super(AgentExecutionThread, dataSource.manager);
	}

	/**
	 * Find an existing thread or create a new one.
	 * On creation, assigns a stable sessionNumber scoped to the project.
	 */
	async findOrCreate(
		threadId: string,
		agentId: string,
		agentName: string,
		projectId: string,
		metadata?: AgentExecutionThreadMetadata,
		taskId?: string | null,
		taskVersionId?: string | null,
	): Promise<{ thread: AgentExecutionThread; created: boolean }> {
		for (let attempt = 0; ; attempt++) {
			try {
				return await this.findOrCreateInSerializableTransaction(
					threadId,
					agentId,
					agentName,
					projectId,
					metadata,
					taskId,
					taskVersionId,
				);
			} catch (error) {
				if (attempt >= SESSION_NUMBER_RETRY_ATTEMPTS - 1 || !isRetriableWriteError(error)) {
					throw error;
				}
			}
		}
	}

	private async findOrCreateInSerializableTransaction(
		threadId: string,
		agentId: string,
		agentName: string,
		projectId: string,
		metadata?: AgentExecutionThreadMetadata,
		taskId?: string | null,
		taskVersionId?: string | null,
	): Promise<{ thread: AgentExecutionThread; created: boolean }> {
		return await this.manager.transaction('SERIALIZABLE', async (entityManager) => {
			const repository = entityManager.getRepository(AgentExecutionThread);
			const existing = await repository.findOneBy({ id: threadId });
			if (existing) {
				return { thread: existing, created: false };
			}

			const maxResult = await repository
				.createQueryBuilder('t')
				.select('MAX(t.sessionNumber)', 'max')
				.where('t.projectId = :projectId', { projectId })
				.getRawOne<{ max: number | null }>();

			const sessionNumber = (maxResult?.max ?? 0) + 1;

			const thread = repository.create({
				id: threadId,
				agentId,
				agentName,
				projectId,
				taskId: taskId ?? null,
				taskVersionId: taskVersionId ?? null,
				sessionNumber,
				parentThreadId: metadata?.parentThreadId ?? null,
				parentAgentId: metadata?.parentAgentId ?? null,
			});
			const saved = await repository.save(thread);
			return { thread: saved, created: true };
		});
	}

	/**
	 * Paginated thread listing sorted by updatedAt DESC.
	 * Uses cursor-based pagination where the cursor is the updatedAt ISO string
	 * of the last item on the previous page.
	 */
	async findByProjectIdPaginated(
		projectId: string,
		agentId: string,
		limit: number,
		cursor?: string,
		filters: AgentSessionQueryFilters = {},
	): Promise<AgentExecutionThreadPage> {
		const query = this.createQueryBuilder('thread')
			.where('thread.projectId = :projectId', { projectId })
			.andWhere('thread.agentId = :agentId', { agentId })
			.orderBy('thread.updatedAt', 'DESC')
			.take(limit + 1);

		if (cursor) {
			query.andWhere('thread.updatedAt < :cursor', { cursor: new Date(cursor) });
		}
		if (filters.updatedAfter) {
			query.andWhere('thread.updatedAt >= :updatedAfter', {
				updatedAfter: filters.updatedAfter,
			});
		}
		if (filters.updatedBefore) {
			query.andWhere('thread.updatedAt <= :updatedBefore', {
				updatedBefore: filters.updatedBefore,
			});
		}
		if (filters.status) {
			const latestStatus = this.latestExecutionStatusSubquery(query);
			const failureExists = this.failureExistsSubquery(query);
			if (filters.status === 'succeeded') {
				query.andWhere(`(${latestStatus}) = 'success' AND NOT EXISTS ${failureExists}`);
			} else if (filters.status === 'error') {
				query.andWhere(
					`((${latestStatus}) = 'error' OR ` +
						`((${latestStatus}) = 'success' AND EXISTS ${failureExists}))`,
				);
			} else {
				query.andWhere(`(${latestStatus}) = :sessionStatus`, {
					sessionStatus: filters.status,
				});
			}
		}
		if (filters.origin) {
			this.applyOriginFilter(query, filters.origin);
		}

		const threads = await query.getMany();

		const hasMore = threads.length > limit;
		if (hasMore) threads.pop();

		return {
			threads,
			nextCursor: hasMore ? threads[threads.length - 1].updatedAt.toISOString() : null,
		};
	}

	private latestExecutionStatusSubquery(query: SelectQueryBuilder<AgentExecutionThread>): string {
		return query
			.subQuery()
			.select('latestExecution.status')
			.from(AgentExecution, 'latestExecution')
			.where('latestExecution.threadId = thread.id')
			.orderBy('latestExecution.createdAt', 'DESC')
			.addOrderBy('latestExecution.id', 'DESC')
			.limit(1)
			.getQuery();
	}

	private failureExistsSubquery(query: SelectQueryBuilder<AgentExecutionThread>): string {
		return query
			.subQuery()
			.select('1')
			.from(AgentExecution, 'failedExecution')
			.where('failedExecution.threadId = thread.id')
			.andWhere('failedExecution.failureSummary IS NOT NULL')
			.getQuery();
	}

	private applyOriginFilter(
		query: SelectQueryBuilder<AgentExecutionThread>,
		origin: AgentSessionOrigin,
	): void {
		const firstSource = query
			.subQuery()
			.select('sourceExecution.source')
			.from(AgentExecution, 'sourceExecution')
			.where('sourceExecution.threadId = thread.id')
			.andWhere('sourceExecution.source IS NOT NULL')
			.orderBy('sourceExecution.createdAt', 'ASC')
			.addOrderBy('sourceExecution.id', 'ASC')
			.limit(1)
			.getQuery();
		const normalizedSource = `LOWER(TRIM(COALESCE((${firstSource}), '')))`;
		const isSubAgent =
			'(thread."parentThreadId" IS NOT NULL OR ' +
			`${normalizedSource} IN ('subagent', 'sub-agent'))`;
		const isSchedule =
			`(NOT ${isSubAgent} AND ` + `(thread."taskId" IS NOT NULL OR ${normalizedSource} = 'task'))`;
		const isDirect = `(NOT ${isSubAgent} AND NOT ${isSchedule})`;

		if (origin === 'sub-agent') {
			query.andWhere(isSubAgent);
		} else if (origin === 'schedule') {
			query.andWhere(isSchedule);
		} else if (origin === 'preview') {
			query.andWhere(`${isDirect} AND ${normalizedSource} IN ('', 'chat', 'n8n_chat')`);
		} else {
			query.andWhere(`${isDirect} AND ${normalizedSource} = :sessionOrigin`, {
				sessionOrigin: origin,
			});
		}
	}

	async findByParentThreadId(
		parentThreadId: string,
		projectId: string,
	): Promise<AgentExecutionThread[]> {
		return await this.find({
			where: { parentThreadId, projectId },
			order: { createdAt: 'ASC' },
		});
	}

	/** Bump updatedAt to now so the thread sorts to top of the list. */
	async bumpUpdatedAt(threadId: string): Promise<void> {
		await this.update(threadId, { updatedAt: new Date() });
	}

	/** Atomically increment token and cost counters on a thread in a single UPDATE. */
	async incrementUsage(
		threadId: string,
		promptTokens: number,
		completionTokens: number,
		cost: number,
		duration: number,
	): Promise<void> {
		const set: Record<string, () => string> = {
			totalPromptTokens: () => '"totalPromptTokens" + :promptTokens',
			totalCompletionTokens: () => '"totalCompletionTokens" + :completionTokens',
		};
		if (cost > 0) {
			set.totalCost = () => '"totalCost" + :cost';
		}
		if (duration > 0) {
			set.totalDuration = () => '"totalDuration" + :duration';
		}

		await this.createQueryBuilder()
			.update(AgentExecutionThread)
			.set(set)
			.where('id = :threadId', { threadId })
			.setParameters({ promptTokens, completionTokens, cost, duration })
			.execute();
	}

	/** Delete a thread, validating project ownership. Returns true if deleted. */
	async deleteByIdAndProjectId(threadId: string, projectId: string): Promise<boolean> {
		const result = await this.delete({ id: threadId, projectId });
		return (result.affected ?? 0) > 0;
	}
}

function isRetriableWriteError(error: unknown): boolean {
	if (!(error instanceof Error) || !('driverError' in error)) return false;
	const { driverError } = error;
	if (typeof driverError !== 'object' || driverError === null || !('code' in driverError)) {
		return false;
	}

	const { code } = driverError;
	return (
		typeof code === 'string' &&
		(code === '40001' || code === '40P01' || code === 'SQLITE_BUSY' || code === 'SQLITE_LOCKED')
	);
}
