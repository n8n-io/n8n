import { Service } from 'typedi';
import { DataSource, Repository } from 'typeorm';
import { WorkflowEntity } from '../entities/WorkflowEntity';

@Service()
export class WorkflowRepository extends Repository<WorkflowEntity> {
	constructor(dataSource: DataSource) {
		super(WorkflowEntity, dataSource.manager);
	}
}
