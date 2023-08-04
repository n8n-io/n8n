import { Service } from 'typedi';
import { DataSource } from 'typeorm';
import { WorkflowEntity } from '../entities/WorkflowEntity';
import { BaseWorkflowRepository } from './AbstractRepository';

@Service()
export class WorkflowRepository extends BaseWorkflowRepository {
	constructor(dataSource: DataSource) {
		super(WorkflowEntity, dataSource.manager);
	}

	private static schemas = {
		queryFilters: {
			getWorkflows: {
				$id: 'GetWorkflowsQueryFilter',
				type: 'object',
				properties: {
					id: { anyOf: [{ type: 'integer' }, { type: 'string' }] },
					name: { type: 'string' },
					active: { type: 'boolean' },
				},
			},
		},
	};

	static toQueryFilter(rawFilter: string) {
		const schema = this.schemas.queryFilters.getWorkflows;

		return BaseWorkflowRepository.toQueryFilter(rawFilter, schema);
	}

	static toQuerySelect(rawSelect: string) {
		const schema = this.schemas.queryFilters.getWorkflows;

		return BaseWorkflowRepository.toQuerySelect(rawSelect, schema);
	}
}

// : QueryFilters.GetAllWorkflows
// : FindOptionsSelect<WorkflowEntity>
