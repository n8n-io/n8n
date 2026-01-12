import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { WorkflowPublishHistory } from '../entities';

@Service()
export class WorkflowPublishHistoryRepository extends Repository<WorkflowPublishHistory> {
	constructor(dataSource: DataSource) {
		super(WorkflowPublishHistory, dataSource.manager);
	}

	async addRecord({
		workflowId,
		versionId,
		event,
		userId,
	}: Pick<WorkflowPublishHistory, 'event' | 'workflowId' | 'versionId' | 'userId'>) {
		await this.insert({
			workflowId,
			versionId,
			event,
			userId,
		});
	}

	async getPublishedVersions(
		workflowId: string,
	): Promise<Array<Pick<WorkflowPublishHistory, 'versionId'>>> {
		return await this.manager
			.createQueryBuilder(WorkflowPublishHistory, 'wph')
			.select('wph.versionId')
			.distinct(true)
			.where('wph.workflowId = :workflowId', { workflowId })
			.getMany();
	}
}
