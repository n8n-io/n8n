import { Service } from '@n8n/di';
import { DataSource, IsNull, LessThan, Not, Repository } from '@n8n/typeorm';
import type { QueryDeepPartialEntity } from '@n8n/typeorm/query-builder/QueryPartialEntity';

import type { KnowledgeSourceStatus } from '../../knowledge.constants';
import { KnowledgeSource } from '../entities/knowledge-source.entity';

export interface KnowledgeSourceStatusUpdate {
	lastError?: string | null;
	lastSyncedAt?: Date | null;
	checkpoint?: Record<string, unknown> | null;
}

@Service()
export class KnowledgeSourceRepository extends Repository<KnowledgeSource> {
	constructor(dataSource: DataSource) {
		super(KnowledgeSource, dataSource.manager);
	}

	async findAllSources(): Promise<KnowledgeSource[]> {
		return await this.find({ order: { createdAt: 'ASC' } });
	}

	async findSourceById(id: string): Promise<KnowledgeSource | null> {
		return await this.findOneBy({ id });
	}

	/**
	 * Sources whose sync interval has elapsed, oldest first. Sources already
	 * syncing are excluded so a slow run is never started a second time.
	 */
	async findSourcesDueForSync(intervalMinutes: number): Promise<KnowledgeSource[]> {
		const cutoff = new Date(Date.now() - intervalMinutes * 60 * 1000);
		const notSyncing = Not<KnowledgeSourceStatus>('syncing');

		return await this.find({
			where: [
				{ status: notSyncing, lastSyncedAt: IsNull() },
				{ status: notSyncing, lastSyncedAt: LessThan(cutoff) },
			],
			order: { lastSyncedAt: 'ASC' },
		});
	}

	/** Only the fields present in `update` are written, so a partial write keeps the rest intact. */
	async updateStatus(
		id: string,
		status: KnowledgeSourceStatus,
		update: KnowledgeSourceStatusUpdate = {},
	): Promise<void> {
		// `checkpoint` is an open-ended JSON blob, which TypeORM's
		// QueryDeepPartialEntity cannot express — hence the cast.
		const values = {
			status,
			...(update.lastError !== undefined ? { lastError: update.lastError } : {}),
			...(update.lastSyncedAt !== undefined ? { lastSyncedAt: update.lastSyncedAt } : {}),
			...(update.checkpoint !== undefined ? { checkpoint: update.checkpoint } : {}),
		} as QueryDeepPartialEntity<KnowledgeSource>;

		await this.update({ id }, values);
	}
}
