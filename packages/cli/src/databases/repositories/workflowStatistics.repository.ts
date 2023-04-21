import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { WorkflowStatistics } from '../entities/WorkflowStatistics';

@Service()
export class WorkflowStatisticsRepository extends Repository<WorkflowStatistics> {
	constructor(dataSource: DataSource) {
		super(WorkflowStatistics, dataSource.manager);
	}
}
