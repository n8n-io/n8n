import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { WorkflowEntity } from '../entities/WorkflowEntity';

@Service()
export class WorkflowRepository extends Repository<WorkflowEntity> {
	constructor(dataSource: DataSource) {
		super(WorkflowEntity, dataSource.manager);
	}
}
