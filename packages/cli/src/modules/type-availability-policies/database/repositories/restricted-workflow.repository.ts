import {
	BaseRepository,
	SharedWorkflow,
	TransactionRunner,
	WorkflowDependency,
	WorkflowEntity,
	type OperationContext,
	type WorkflowIdsQuery,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { restrictedNodeTypeMatch, type RestrictedNodeTypes } from './restricted-node-type-match';

const runningVersionRows = (dependencyAlias: string, workflowAlias: string) =>
	`((${workflowAlias}.activeVersionId IS NULL AND ${dependencyAlias}.publishedVersionId IS NULL) OR ${dependencyAlias}.publishedVersionId = ${workflowAlias}.activeVersionId)`;

class WorkflowDependencyTable extends BaseRepository<WorkflowDependency> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowDependency, dataSource.manager, transactionRunner);
	}
}

@Service()
export class RestrictedWorkflowRepository {
	private readonly table: WorkflowDependencyTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new WorkflowDependencyTable(dataSource, transactionRunner);
	}

	async findRunningNodeTypes(ctx: OperationContext): Promise<string[]> {
		const rows = await this.table
			.managerFor(ctx)
			.createQueryBuilder(WorkflowDependency, 'dependency')
			.innerJoin(WorkflowEntity, 'workflow', 'workflow.id = dependency.workflowId')
			.select('dependency.dependencyKey', 'nodeType')
			.distinct(true)
			.where('dependency.dependencyType = :dependencyType', { dependencyType: 'nodeType' })
			.andWhere(runningVersionRows('dependency', 'workflow'))
			.getRawMany<{ nodeType: string }>();

		return rows.map(({ nodeType }) => nodeType);
	}

	restrictedWorkflowIdsQuery(
		restricted: RestrictedNodeTypes,
		ctx: OperationContext,
	): WorkflowIdsQuery {
		const { condition, parameters } = restrictedNodeTypeMatch(
			restricted,
			this.table.managerFor(ctx).connection.options.type === 'postgres',
		);
		const subQuery = this.table
			.managerFor(ctx)
			.createQueryBuilder(WorkflowDependency, 'restrictedDep')
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
