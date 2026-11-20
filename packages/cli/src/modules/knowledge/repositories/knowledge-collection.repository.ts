import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { AgentKnowledgeDependency, KnowledgeCollection } from '../entities';

class KnowledgeCollectionTable extends BaseRepository<KnowledgeCollection> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(KnowledgeCollection, dataSource.manager, transactionRunner);
	}
}

@Service()
export class KnowledgeCollectionRepository {
	private readonly table: KnowledgeCollectionTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new KnowledgeCollectionTable(dataSource, transactionRunner);
	}

	async findByIdAndProjectId(
		id: string,
		projectId: string,
		ctx: OperationContext,
	): Promise<KnowledgeCollection | null> {
		return await this.table.managerFor(ctx).findOneBy(KnowledgeCollection, { id, projectId });
	}

	/** The ids of the agents that use the collection. */
	async findAgentIds(collectionId: string, ctx: OperationContext): Promise<string[]> {
		const dependencies = await this.table.managerFor(ctx).find(AgentKnowledgeDependency, {
			select: ['agentId'],
			where: { knowledgeCollectionId: collectionId },
		});

		return dependencies.map((dependency) => dependency.agentId);
	}
}
