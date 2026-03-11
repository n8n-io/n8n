import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowPublishedVersion } from '../entities';

@Service()
export class WorkflowPublishedVersionRepository extends Repository<WorkflowPublishedVersion> {
	constructor(dataSource: DataSource) {
		super(WorkflowPublishedVersion, dataSource.manager);
	}

	async setPublishedVersion(workflowId: string, publishedVersionId: string): Promise<void> {
		await this.upsert({ workflowId, publishedVersionId }, ['workflowId']);
	}

	async removePublishedVersion(workflowId: string): Promise<void> {
		await this.delete({ workflowId });
	}

	async getPublishedVersionId(workflowId: string): Promise<string | null> {
		const record = await this.findOne({
			where: { workflowId },
			select: ['publishedVersionId'],
		});
		return record?.publishedVersionId ?? null;
	}
}
