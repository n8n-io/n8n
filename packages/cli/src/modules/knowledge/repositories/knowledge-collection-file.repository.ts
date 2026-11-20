import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { KnowledgeFile } from '../entities';

class KnowledgeCollectionFileTable extends BaseRepository<KnowledgeFile> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(KnowledgeFile, dataSource.manager, transactionRunner);
	}
}

@Service()
export class KnowledgeCollectionFileRepository {
	private readonly table: KnowledgeCollectionFileTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new KnowledgeCollectionFileTable(dataSource, transactionRunner);
	}

	async findByCollectionId(collectionId: string, ctx: OperationContext): Promise<KnowledgeFile[]> {
		return await this.table.managerFor(ctx).find(KnowledgeFile, {
			where: { knowledgeCollectionId: collectionId },
			// The id sort keeps the order stable when the files of one upload
			// share the same createdAt timestamp.
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	async findByIdAndCollectionId(
		{ fileId, collectionId }: { fileId: string; collectionId: string },
		ctx: OperationContext,
	): Promise<KnowledgeFile | null> {
		return await this.table
			.managerFor(ctx)
			.findOneBy(KnowledgeFile, { id: fileId, knowledgeCollectionId: collectionId });
	}

	async saveUploadedFile(
		file: Pick<
			KnowledgeFile,
			| 'id'
			| 'knowledgeCollectionId'
			| 'name'
			| 'storedAt'
			| 'storageKey'
			| 'mimeType'
			| 'fileSizeBytes'
			| 'createdById'
		>,
		ctx: OperationContext,
	): Promise<KnowledgeFile> {
		const manager = this.table.managerFor(ctx);
		const knowledgeFile = manager.create(KnowledgeFile, file);
		return await manager.save(KnowledgeFile, knowledgeFile);
	}

	async deleteByIdAndCollectionId(
		{ fileId, collectionId }: { fileId: string; collectionId: string },
		ctx: OperationContext,
	): Promise<void> {
		await this.table
			.managerFor(ctx)
			.delete(KnowledgeFile, { id: fileId, knowledgeCollectionId: collectionId });
	}
}
