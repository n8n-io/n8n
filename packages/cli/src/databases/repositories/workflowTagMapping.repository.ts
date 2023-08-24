import { Service } from 'typedi';
import { DataSource, Repository } from '@n8n/typeorm';
import { WorkflowTagMapping } from '../entities/WorkflowTagMapping';

@Service()
export class WorkflowTagMappingRepository extends Repository<WorkflowTagMapping> {
	constructor(dataSource: DataSource) {
		super(WorkflowTagMapping, dataSource.manager);
	}
}
