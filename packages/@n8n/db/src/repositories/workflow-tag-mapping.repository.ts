import { Service } from '@n8n/di';
import type { EntityManager } from '@n8n/typeorm';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowTagMapping } from '../entities';
import { withTransaction } from '../utils/transaction';

@Service()
export class WorkflowTagMappingRepository extends Repository<WorkflowTagMapping> {
	constructor(dataSource: DataSource) {
		super(WorkflowTagMapping, dataSource.manager);
	}

	async overwriteTaggings(workflowId: string, tagIds: string[], trx?: EntityManager) {
		return await withTransaction(this.manager, trx, async (tx) => {
			await tx.delete(WorkflowTagMapping, { workflowId });

			const taggings = tagIds.map((tagId) => tx.create(WorkflowTagMapping, { workflowId, tagId }));

			return await tx.insert(WorkflowTagMapping, taggings);
		});
	}
}
