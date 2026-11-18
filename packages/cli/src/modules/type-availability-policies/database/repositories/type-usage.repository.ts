import type { CredentialTypeUsageResponse } from '@n8n/api-types';
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
import { DataSource } from '@n8n/typeorm';

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
		const query = this.table
			.managerFor(ctx)
			.createQueryBuilder(WorkflowDependency, 'dependency')
			.innerJoin(WorkflowEntity, 'workflow', 'workflow.id = dependency.workflowId')
			.innerJoin(CredentialsEntity, 'credential', 'credential.id = dependency.dependencyKey')
			.innerJoin(
				SharedWorkflow,
				'owner',
				"owner.workflowId = dependency.workflowId AND owner.role = 'workflow:owner'",
			)
			.select('credential.type', 'type')
			.addSelect('COUNT(*)', 'uses')
			.addSelect('COUNT(DISTINCT dependency.workflowId)', 'workflows')
			.addSelect(
				'COUNT(DISTINCT CASE WHEN workflow.activeVersionId IS NOT NULL THEN dependency.workflowId END)',
				'activeWorkflows',
			)
			.addSelect('COUNT(DISTINCT owner.projectId)', 'projects')
			.where('dependency.dependencyType = :dependencyType', { dependencyType: 'credentialId' })
			.andWhere(runningVersionRows('dependency', 'workflow'))
			.andWhere('workflow.isArchived = :isArchived', { isArchived: false })
			.groupBy('credential.type');

		if (projectId !== null) {
			query.andWhere('owner.projectId = :projectId', { projectId });
		}

		const rows = await query.getRawMany<UsageRow>();

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
