import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowPublishedEnvironmentVersion } from '../entities';

@Service()
export class WorkflowPublishedEnvironmentVersionRepository extends Repository<WorkflowPublishedEnvironmentVersion> {
	constructor(dataSource: DataSource) {
		super(WorkflowPublishedEnvironmentVersion, dataSource.manager);
	}

	async setPublishedVersion(
		workflowId: string,
		environmentId: string,
		publishedVersionId: string,
	): Promise<void> {
		await this.upsert({ workflowId, environmentId, publishedVersionId }, [
			'workflowId',
			'environmentId',
		]);
	}

	async removePublishedVersion(workflowId: string, environmentId: string): Promise<void> {
		await this.delete({ workflowId, environmentId });
	}

	async getPublishedVersionId(workflowId: string, environmentId: string): Promise<string | null> {
		const record = await this.findOne({
			where: { workflowId, environmentId },
			select: ['publishedVersionId'],
		});
		return record?.publishedVersionId ?? null;
	}

	async getPublishedVersionsForWorkflow(workflowId: string): Promise<Record<string, string>> {
		const records = await this.find({
			where: { workflowId },
			select: ['environmentId', 'publishedVersionId'],
		});
		return Object.fromEntries(records.map((r) => [r.environmentId, r.publishedVersionId]));
	}
}
