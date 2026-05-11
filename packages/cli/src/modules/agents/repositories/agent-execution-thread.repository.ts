import { Service } from '@n8n/di';
import { DataSource, LessThan, Repository } from '@n8n/typeorm';

import { AgentExecutionThread } from '../entities/agent-execution-thread.entity';

const SESSION_NUMBER_RETRY_ATTEMPTS = 3;

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
	): Promise<{ thread: AgentExecutionThread; created: boolean }> {
		for (let attempt = 0; ; attempt++) {
			try {
				return await this.findOrCreateInSerializableTransaction(
					threadId,
					agentId,
					agentName,
					projectId,
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
				sessionNumber,
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
		limit: number,
		cursor?: string,
		agentId?: string,
	): Promise<AgentExecutionThreadPage> {
		const where: Record<string, unknown> = { projectId };
		if (agentId) {
			where.agentId = agentId;
		}
		if (cursor) {
			where.updatedAt = LessThan(new Date(cursor));
		}

		const threads = await this.find({
			where,
			order: { updatedAt: 'DESC' },
			take: limit + 1,
		});

		const hasMore = threads.length > limit;
		if (hasMore) threads.pop();

		return {
			threads,
			nextCursor: hasMore ? threads[threads.length - 1].updatedAt.toISOString() : null,
		};
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
