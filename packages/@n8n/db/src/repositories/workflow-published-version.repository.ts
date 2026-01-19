import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowPublishedVersion } from '../entities';

@Service()
export class WorkflowPublishedVersionRepository extends Repository<WorkflowPublishedVersion> {
	constructor(dataSource: DataSource) {
		super(WorkflowPublishedVersion, dataSource.manager);
	}

	/**
	 * Insert or update the published version record for a workflow.
	 * This is called when a workflow is activated.
	 */
	async upsertPublishedVersion(workflowId: string, publishedVersionId: string): Promise<void> {
		await this.upsert(
			{
				workflowId,
				publishedVersionId,
			},
			['workflowId'],
		);
	}

	/**
	 * Delete the published version record for a workflow.
	 * This is called when a workflow is deactivated.
	 */
	async deletePublishedVersion(workflowId: string): Promise<void> {
		await this.delete({ workflowId });
	}
}
