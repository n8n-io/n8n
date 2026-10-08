import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { WorkflowTagMapping } from '../entities';
import { type OperationContext, TransactionRunner } from '../services/transaction';

@Service()
export class WorkflowTagMappingRepository extends BaseRepository<WorkflowTagMapping> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowTagMapping, dataSource.manager, transactionRunner);
	}

	async overwriteTaggings(workflowId: string, tagIds: string[], ctx: OperationContext = {}) {
		return await this.runInTransaction(ctx, async (tx) => {
			await tx.delete(WorkflowTagMapping, { workflowId });

			const taggings = tagIds.map((tagId) => this.create({ workflowId, tagId }));

			return await tx.insert(WorkflowTagMapping, taggings);
		});
	}
}
