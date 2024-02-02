import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { WorkflowTagMapping } from '../entities/WorkflowTagMapping';

@Service()
export class WorkflowTagMappingRepository extends Repository<WorkflowTagMapping> {
	constructor(dataSource: DataSource) {
		super(WorkflowTagMapping, dataSource.manager);
	}

	async overwriteTaggings(workflowId: string, tagIds: string[]) {
		return await this.manager.transaction(async () => {
			await this.delete({ workflowId });

			const taggings = tagIds.map((tagId) => this.create({ workflowId, tagId }));

			return await this.insert(taggings);
		});
	}
}
