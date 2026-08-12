import { Service } from '@n8n/di';
import { DataSource, In, Repository } from '@n8n/typeorm';

import { KnowledgeDocument } from '../entities/knowledge-document.entity';

export interface KnowledgeDocumentUpsert {
	sourceId: string;
	externalId: string;
	title: string;
	url?: string | null;
	contentHash: string;
	chunkCount: number;
	meta?: Record<string, string | number | boolean> | null;
	sourceUpdatedAt?: Date | null;
}

@Service()
export class KnowledgeDocumentRepository extends Repository<KnowledgeDocument> {
	constructor(dataSource: DataSource) {
		super(KnowledgeDocument, dataSource.manager);
	}

	async findBySourceAndExternalId(
		sourceId: string,
		externalId: string,
	): Promise<KnowledgeDocument | null> {
		return await this.findOneBy({ sourceId, externalId });
	}

	/** Every externalId currently indexed for a source, used to prune documents deleted at the source. */
	async listExternalIds(sourceId: string): Promise<string[]> {
		const rows = await this.find({ where: { sourceId }, select: ['externalId'] });

		return rows.map((row) => row.externalId);
	}

	/**
	 * Read-modify-write rather than `upsert`, so callers get the persisted row
	 * back (chunk ids are derived from it) and the `updatedAt` hook still fires.
	 */
	async upsertDocument(document: KnowledgeDocumentUpsert): Promise<KnowledgeDocument> {
		const existing = await this.findBySourceAndExternalId(document.sourceId, document.externalId);

		const entity =
			existing ?? this.create({ sourceId: document.sourceId, externalId: document.externalId });

		entity.title = document.title;
		entity.url = document.url ?? null;
		entity.contentHash = document.contentHash;
		entity.chunkCount = document.chunkCount;
		entity.meta = document.meta ?? null;
		entity.sourceUpdatedAt = document.sourceUpdatedAt ?? null;

		return await this.save(entity);
	}

	/** Returns the number of rows removed. */
	async deleteBySourceAndExternalIds(sourceId: string, externalIds: string[]): Promise<number> {
		if (externalIds.length === 0) return 0;

		const result = await this.delete({ sourceId, externalId: In(externalIds) });

		return result.affected ?? 0;
	}

	async countBySource(sourceId: string): Promise<number> {
		return await this.countBy({ sourceId });
	}
}
