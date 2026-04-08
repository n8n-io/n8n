import { Service } from '@n8n/di';
import { DataSource, LessThan, Repository } from '@n8n/typeorm';

import { ExecutionThread } from '../entities/execution-thread.entity';

export interface ThreadPage {
	threads: ExecutionThread[];
	nextCursor: string | null;
}

@Service()
export class ExecutionThreadRepository extends Repository<ExecutionThread> {
	constructor(dataSource: DataSource) {
		super(ExecutionThread, dataSource.manager);
	}

	/**
	 * Find an existing thread or create a new one.
	 * Returns the thread and whether it was newly created.
	 */
	async findOrCreate(
		threadId: string,
		agentId: string,
		agentName: string,
		projectId: string,
	): Promise<{ thread: ExecutionThread; created: boolean }> {
		const existing = await this.findOneBy({ id: threadId });
		if (existing) {
			return { thread: existing, created: false };
		}

		const thread = this.create({ id: threadId, agentId, agentName, projectId });
		const saved = await this.save(thread);
		return { thread: saved, created: true };
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
	): Promise<ThreadPage> {
		const where: Record<string, unknown> = { projectId };
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
}
