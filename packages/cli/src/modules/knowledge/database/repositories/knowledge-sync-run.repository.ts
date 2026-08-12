import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import type { KnowledgeSyncMode, KnowledgeSyncRunStatus } from '../../knowledge.constants';
import type { KnowledgeSyncStats } from '../entities/knowledge-sync-run.entity';
import { KnowledgeSyncRun } from '../entities/knowledge-sync-run.entity';

@Service()
export class KnowledgeSyncRunRepository extends Repository<KnowledgeSyncRun> {
	constructor(dataSource: DataSource) {
		super(KnowledgeSyncRun, dataSource.manager);
	}

	async createRun(sourceId: string, mode: KnowledgeSyncMode): Promise<KnowledgeSyncRun> {
		const run = this.create({ sourceId, mode, status: 'running', startedAt: new Date() });

		return await this.save(run);
	}

	async finishRun(
		id: string,
		status: KnowledgeSyncRunStatus,
		stats: KnowledgeSyncStats | null,
		error?: string,
	): Promise<void> {
		await this.update({ id }, { status, stats, error: error ?? null, finishedAt: new Date() });
	}

	async findRecentRuns(sourceId: string, limit: number): Promise<KnowledgeSyncRun[]> {
		return await this.find({
			where: { sourceId },
			order: { startedAt: 'DESC' },
			take: limit,
		});
	}
}
