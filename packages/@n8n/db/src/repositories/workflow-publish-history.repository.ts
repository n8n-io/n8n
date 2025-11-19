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
		status,
	}: Pick<WorkflowPublishHistory, 'status' | 'workflowId' | 'versionId'>) {
		return await this.insert({ workflowId, versionId: versionId ?? null, status });
	}
}
