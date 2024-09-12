import { DataSource, LessThan, Repository } from '@n8n/typeorm';
import { Service } from 'typedi';

import { WorkflowHistory } from '../entities/workflow-history';

@Service()
export class WorkflowHistoryRepository extends Repository<WorkflowHistory> {
	constructor(dataSource: DataSource) {
		super(WorkflowHistory, dataSource.manager);
	}

	async deleteEarlierThan(date: Date) {
		return await this.delete({ createdAt: LessThan(date) });
	}
}
