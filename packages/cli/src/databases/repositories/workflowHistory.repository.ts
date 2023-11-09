import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { WorkflowHistory } from '../entities/WorkflowHistory';

@Service()
export class WorkflowHistoryRepository extends Repository<WorkflowHistory> {
	constructor(dataSource: DataSource) {
		super(WorkflowHistory, dataSource.manager);
	}
}
