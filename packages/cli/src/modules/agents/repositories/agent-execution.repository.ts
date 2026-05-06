import { Service } from '@n8n/di';
import { DataSource, IsNull, Repository } from '@n8n/typeorm';

import { AgentExecution } from '../entities/agent-execution.entity';

@Service()
export class AgentExecutionRepository extends Repository<AgentExecution> {
	constructor(dataSource: DataSource) {
		super(AgentExecution, dataSource.manager);
	}

	/** All executions in a thread, oldest first — used by the timeline view. */
	async findByThreadIdOrdered(threadId: string): Promise<AgentExecution[]> {
		return await this.find({ where: { threadId }, order: { createdAt: 'ASC' } });
	}

	/**
	 * The first user-message text in each of the given threads. Used by the
	 * sessions list to render a preview before the LLM-generated title is
	 * available.
	 *
	 * Excludes resumed runs (empty `userMessage`). Returns one row per thread
	 * containing the userMessage from that thread's earliest matching run.
	 */
	async findFirstUserMessageByThreadIds(threadIds: string[]): Promise<Map<string, string>> {
		if (threadIds.length === 0) return new Map();

		// Correlated subquery: for each thread, pick the row with the smallest
		// createdAt that has a non-empty userMessage.
		const rows = await this.createQueryBuilder('e')
			.select(['e.threadId AS threadId', 'e.userMessage AS userMessage'])
			.where('e.threadId IN (:...threadIds)', { threadIds })
			.andWhere("e.userMessage != ''")
			.andWhere(
				'e.createdAt = (SELECT MIN(e2.createdAt) FROM agent_execution e2 ' +
					"WHERE e2.threadId = e.threadId AND e2.userMessage != '')",
			)
			.getRawMany<{ threadId: string; userMessage: string }>();

		return new Map(rows.map((r) => [r.threadId, r.userMessage]));
	}

	/**
	 * Suspended runs in a thread that don't yet have a `model` recorded.
	 * Used by the resume-completion path to backfill model info, which only
	 * arrives once the resumed run finishes.
	 */
	async findSuspendedWithoutModel(threadId: string): Promise<AgentExecution[]> {
		return await this.find({
			where: { threadId, hitlStatus: 'suspended', model: IsNull() },
		});
	}

	/** Backfill model on a set of executions in a single statement. */
	async backfillModel(executionIds: string[], model: string): Promise<void> {
		if (executionIds.length === 0) return;
		await this.createQueryBuilder()
			.update(AgentExecution)
			.set({ model })
			.whereInIds(executionIds)
			.execute();
	}

	/** Delete every run in a thread. Caller must verify ownership first. */
	async deleteByThreadId(threadId: string): Promise<void> {
		await this.delete({ threadId });
	}
}
