import type { CredentialTypeUsageResponse, NodeTypeUsageResponse, TypeUsage } from '@n8n/api-types';
import {
	BaseRepository,
	CredentialsEntity,
	SharedWorkflow,
	TransactionRunner,
	WorkflowDependency,
	WorkflowEntity,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, type ObjectLiteral, type SelectQueryBuilder } from '@n8n/typeorm';

import { runningVersionRows } from './running-version-rows';

class WorkflowDependencyTable extends BaseRepository<WorkflowDependency> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowDependency, dataSource.manager, transactionRunner);
	}
}

type UsageRow = {
	type: string;
	uses: string;
	workflows: string;
	activeWorkflows: string;
	projects: string;
};

/** The columns that the usage counts read. */
type UsageColumns = { workflowId: string; activeVersionId: string; projectId: string };

const RUNNING_DEPENDENCY_COLUMNS: UsageColumns = {
	workflowId: 'dependency.workflowId',
	activeVersionId: 'workflow.activeVersionId',
	projectId: 'owner.projectId',
};

@Service()
export class TypeUsageRepository {
	private readonly table: WorkflowDependencyTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new WorkflowDependencyTable(dataSource, transactionRunner);
	}

	/**
	 * Counts the credentials that the running version of each non-archived workflow selects.
	 * A credential left on a node after an auth mode change counts, because the credential type
	 * check blocks on it too. With a `projectId`, counts only the workflows that the project owns.
	 */
	async countCredentialTypeUsage(
		projectId: string | null,
		ctx: OperationContext,
	): Promise<CredentialTypeUsageResponse> {
		const query = this.runningDependencies('credentialId', projectId, ctx)
			.innerJoin(CredentialsEntity, 'credential', 'credential.id = dependency.dependencyKey')
			.select('credential.type', 'type')
			.groupBy('credential.type');

		return await this.countByType(query);
	}

	/**
	 * Counts the nodes of each type in the running version of each non-archived workflow, keyed by
	 * the literal type name. With a `projectId`, counts only the workflows that the project owns.
	 */
	async countNodeTypeUsage(
		projectId: string | null,
		ctx: OperationContext,
	): Promise<NodeTypeUsageResponse> {
		const query = this.runningDependencies('nodeType', projectId, ctx)
			.select('dependency.dependencyKey', 'type')
			.groupBy('dependency.dependencyKey');

		return await this.countByType(query);
	}

	/**
	 * Counts each group of node types as one type, keyed by the group name. `groups` maps a group
	 * name to the type names in it. A workflow that has more than one type of a group counts once.
	 */
	async countNodeTypeUsageByGroup(
		projectId: string | null,
		groups: ReadonlyMap<string, string[]>,
		ctx: OperationContext,
	): Promise<NodeTypeUsageResponse> {
		if (groups.size === 0) return {};

		const entries = [...groups];
		const cases = entries.map(
			(_, index) => `WHEN dependency.dependencyKey IN (:...members${index}) THEN :group${index}`,
		);
		const parameters = Object.fromEntries(
			entries.flatMap(([group, members], index) => [
				[`members${index}`, members],
				[`group${index}`, group],
			]),
		);

		// The inner query maps each row to its group. The outer query groups by that plain column,
		// because drivers differ on a GROUP BY over an expression with bound parameters.
		const rows = this.runningDependencies('nodeType', projectId, ctx)
			.select(`CASE ${cases.join(' ')} END`, 'type')
			.addSelect('dependency.workflowId', 'workflow_id')
			.addSelect('workflow.activeVersionId', 'active_version_id')
			.addSelect('owner.projectId', 'project_id')
			.andWhere('dependency.dependencyKey IN (:...members)', {
				members: entries.flatMap(([, members]) => members),
			})
			.setParameters(parameters);

		const query = this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.select('grouped.type', 'type')
			.from(`(${rows.getQuery()})`, 'grouped')
			.setParameters(rows.getParameters())
			.groupBy('grouped.type');

		return await this.countByType(query, {
			workflowId: 'grouped.workflow_id',
			activeVersionId: 'grouped.active_version_id',
			projectId: 'grouped.project_id',
		});
	}

	/**
	 * Rows of one dependency type from the running version of each non-archived workflow, joined
	 * to the workflow and to the project that owns it. A workflow counts only in that project, also
	 * when it is shared with other projects.
	 */
	private runningDependencies(
		dependencyType: WorkflowDependency['dependencyType'],
		projectId: string | null,
		ctx: OperationContext,
	): SelectQueryBuilder<WorkflowDependency> {
		const query = this.table
			.managerFor(ctx)
			.createQueryBuilder(WorkflowDependency, 'dependency')
			.innerJoin(WorkflowEntity, 'workflow', 'workflow.id = dependency.workflowId')
			.innerJoin(
				SharedWorkflow,
				'owner',
				"owner.workflowId = dependency.workflowId AND owner.role = 'workflow:owner'",
			)
			.where('dependency.dependencyType = :dependencyType', { dependencyType })
			.andWhere(runningVersionRows('dependency', 'workflow'))
			.andWhere('workflow.isArchived = :isArchived', { isArchived: false });

		if (projectId !== null) {
			query.andWhere('owner.projectId = :projectId', { projectId });
		}

		return query;
	}

	/** Adds the usage counts to a query that selects and groups by `type`. */
	private async countByType<T extends ObjectLiteral>(
		query: SelectQueryBuilder<T>,
		columns: UsageColumns = RUNNING_DEPENDENCY_COLUMNS,
	): Promise<Record<string, TypeUsage>> {
		const { workflowId, activeVersionId, projectId } = columns;
		const rows = await query
			.addSelect('COUNT(*)', 'uses')
			.addSelect(`COUNT(DISTINCT ${workflowId})`, 'workflows')
			.addSelect(
				`COUNT(DISTINCT CASE WHEN ${activeVersionId} IS NOT NULL THEN ${workflowId} END)`,
				'activeWorkflows',
			)
			.addSelect(`COUNT(DISTINCT ${projectId})`, 'projects')
			.getRawMany<UsageRow>();

		return Object.fromEntries(
			rows.map((row) => [
				row.type,
				{
					uses: Number(row.uses),
					workflows: Number(row.workflows),
					activeWorkflows: Number(row.activeWorkflows),
					projects: Number(row.projects),
				},
			]),
		);
	}
}
