import { Service } from 'typedi';
import { DataSource, LessThan, Repository } from 'typeorm';
import { WorkflowHistory } from '../entities/WorkflowHistory';

@Service()
export class WorkflowHistoryRepository extends Repository<WorkflowHistory> {
	constructor(dataSource: DataSource) {
		super(WorkflowHistory, dataSource.manager);
	}

	async deleteEarlierThan(date: Date) {
		return await this.delete({ createdAt: LessThan(date) });
	}
}
