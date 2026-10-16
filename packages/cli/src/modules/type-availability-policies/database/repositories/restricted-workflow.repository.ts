import { SharedWorkflow, WorkflowDependency, WorkflowEntity, type WorkflowIdsQuery } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';

import { restrictedNodeTypeMatch, type RestrictedNodeTypes } from './restricted-node-type-match';

const runningVersionRows = (dependencyAlias: string, workflowAlias: string) =>
	`((${workflowAlias}.activeVersionId IS NULL AND ${dependencyAlias}.publishedVersionId IS NULL) OR ${dependencyAlias}.publishedVersionId = ${workflowAlias}.activeVersionId)`;

@Service()
export class RestrictedWorkflowRepository extends Repository<WorkflowDependency> {
	constructor(dataSource: DataSource) {
		super(WorkflowDependency, dataSource.manager);
	}

	async findRunningNodeTypes(): Promise<string[]> {
		const rows = await this.createQueryBuilder('dependency')
			.innerJoin(WorkflowEntity, 'workflow', 'workflow.id = dependency.workflowId')
			.select('dependency.dependencyKey', 'nodeType')
			.distinct(true)
			.where('dependency.dependencyType = :dependencyType', { dependencyType: 'nodeType' })
			.andWhere(runningVersionRows('dependency', 'workflow'))
			.getRawMany<{ nodeType: string }>();

		return rows.map(({ nodeType }) => nodeType);
	}

	restrictedWorkflowIdsQuery(restricted: RestrictedNodeTypes): WorkflowIdsQuery {
		const { condition, parameters } = restrictedNodeTypeMatch(
			restricted,
			this.manager.connection.options.type === 'postgres',
		);
		const subQuery = this.createQueryBuilder('restrictedDep')
			.select('restrictedDep.workflowId')
			.innerJoin(
				WorkflowEntity,
				'restrictedWorkflow',
				'restrictedWorkflow.id = restrictedDep.workflowId',
			)
			.innerJoin(
				SharedWorkflow,
				'restrictedOwner',
				"restrictedOwner.workflowId = restrictedDep.workflowId AND restrictedOwner.role = 'workflow:owner'",
			)
			.where('restrictedDep.dependencyType = :restrictedDepType', { restrictedDepType: 'nodeType' })
			.andWhere(runningVersionRows('restrictedDep', 'restrictedWorkflow'))
			.andWhere(condition, parameters);

		return { query: subQuery.getQuery(), parameters: subQuery.getParameters() };
	}
}
