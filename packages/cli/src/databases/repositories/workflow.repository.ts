import { Service } from 'typedi';
import { DataSource } from 'typeorm';
import { WorkflowEntity } from '../entities/WorkflowEntity';
import { BaseWorkflowRepository } from './AbstractRepository';

@Service()
export class WorkflowRepository extends BaseWorkflowRepository {
	constructor(dataSource: DataSource) {
		super(WorkflowEntity, dataSource.manager);
	}
}
