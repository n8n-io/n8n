import { Service } from '@n8n/di';
import { DataSource, IsNull, Repository } from '@n8n/typeorm';

import type { AgentExecutionLogStorageLocation } from '../agent-execution-log/types';
import { AgentExecution } from '../entities/agent-execution.entity';

export type AgentExecutionLogTargetRow = {
	id: string;
	threadId: string;
	logStoredAt: AgentExecutionLogStorageLocation;
};

@Service()
export class AgentExecutionRepository extends Repository<AgentExecution> {
	constructor(dataSource: DataSource) {
		super(AgentExecution, dataSource.manager);
	}

	/** All executions in a thread, oldest first — used by the timeline view. */
	async findByThreadIdOrdered(threadId: string): Promise<AgentExecution[]> {
		return await this.find({ where: { threadId }, order: { createdAt: 'ASC' } });
	}

	async findLogTargetsByThreadId(threadId: string): Promise<AgentExecutionLogTargetRow[]> {
		const rows = await this.find({
			where: { threadId },
			select: ['id', 'threadId', 'logStoredAt'],
		});
		return rows.map((row) => ({
			id: row.id,
			threadId: row.threadId,
			logStoredAt: row.logStoredAt,
		}));
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
