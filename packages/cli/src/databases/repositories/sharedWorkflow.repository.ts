import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { SharedWorkflow } from '../entities/SharedWorkflow';

@Service()
export class SharedWorkflowRepository extends Repository<SharedWorkflow> {
	constructor(dataSource: DataSource) {
		super(SharedWorkflow, dataSource.manager);
	}
}
