import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, IsNull, LessThan, Repository, Not } from '@n8n/typeorm';

import { WorkflowDependency } from '../entities';

const INDEX_VERSION_ID = 1;

/**
 * Helper class to collect workflow dependencies before writing them to the database.
 */
export class WorkflowDependencies {
	readonly dependencies: WorkflowDependency[] = [];

	constructor(
		readonly workflowId: string,
		readonly workflowVersionId: number | undefined,
		readonly publishedVersionId: string | null = null,
	) {}

	add(dependency: {
		dependencyType: string;
		dependencyKey: string | null;
		dependencyInfo: Record<string, unknown> | null;
	}) {
		const dep = new WorkflowDependency();
		Object.assign(dep, dependency);
		Object.assign(dep, {
			workflowId: this.workflowId,
			workflowVersionId: this.workflowVersionId,
			publishedVersionId: this.publishedVersionId,
			indexVersionId: INDEX_VERSION_ID,
		});
		this.dependencies.push(dep);
	}
}

@Service()
export class WorkflowDependencyRepository extends Repository<WorkflowDependency> {
	constructor(
		dataSource: DataSource,
		private readonly databaseConfig: DatabaseConfig,
	) {
		super(WorkflowDependency, dataSource.manager);
	}
	/**
	 * How many workflows in these projects use each node type, most-used first.
	 *
	 * This is the cheap bottom rung of preference discovery: answering "what does this project reach
	 * for" by reading every workflow costs a full estate fetch, while the index already holds the
	 * answer. Measured on ten workflows, the aggregate is ~85 tokens against ~6,500 to read them.
	 *
	 * Draft rows only (`publishedVersionId IS NULL`), because what someone is building is a better
	 * statement of preference than what happens to be published. Archived workflows are excluded:
	 * they are what the project used to do.
	 */
	async countNodeTypesForProjects(
		projectIds: string[],
		options: { includeArchived?: boolean } = {},
	): Promise<{
		workflowsInScope: number;
		nodeTypes: Array<{ nodeType: string; workflowCount: number }>;
	}> {
		if (projectIds.length === 0) return { workflowsInScope: 0, nodeTypes: [] };

		const query = this.createQueryBuilder('dependency')
			// A workflow can be shared into several projects, so the join can multiply rows. The
			// COUNT is DISTINCT on workflowId for that reason, not as a precaution.
			.innerJoin('shared_workflow', 'shared', 'shared.workflowId = dependency.workflowId')
			.innerJoin('workflow_entity', 'workflow', 'workflow.id = dependency.workflowId')
			.select('dependency.dependencyKey', 'nodeType')
			.addSelect('COUNT(DISTINCT dependency.workflowId)', 'workflowCount')
			.where('dependency.dependencyType = :type', { type: 'nodeType' })
			.andWhere('dependency.publishedVersionId IS NULL')
			.andWhere('shared.projectId IN (:...projectIds)', { projectIds })
			.groupBy('dependency.dependencyKey')
			.orderBy('COUNT(DISTINCT dependency.workflowId)', 'DESC')
			.addOrderBy('dependency.dependencyKey', 'ASC');

		if (!options.includeArchived) {
			query.andWhere('workflow.isArchived = :archived', { archived: false });
		}

		const rows = await query.getRawMany<{ nodeType: string; workflowCount: number | string }>();

		// The denominator comes back with the counts so a caller never has to pair them up itself,
		// and so "10 of 10" cannot be assembled from two reads of a moving target.
		const scope = this.createQueryBuilder('dependency')
			.innerJoin('shared_workflow', 'shared', 'shared.workflowId = dependency.workflowId')
			.innerJoin('workflow_entity', 'workflow', 'workflow.id = dependency.workflowId')
			.select('COUNT(DISTINCT dependency.workflowId)', 'total')
			.where('dependency.publishedVersionId IS NULL')
			.andWhere('shared.projectId IN (:...projectIds)', { projectIds });
		if (!options.includeArchived) {
			scope.andWhere('workflow.isArchived = :archived', { archived: false });
		}
		const total = await scope.getRawOne<{ total: number | string }>();

		return {
			// Postgres returns COUNT as a bigint string.
			workflowsInScope: Number(total?.total ?? 0),
			nodeTypes: rows.map((row) => ({
				nodeType: row.nodeType,
				workflowCount: Number(row.workflowCount),
			})),
		};
	}

	/**
	 * Which workflows in these projects use a given node type. The rung below the aggregate: once
	 * the histogram says a node type is the house choice, this says where to read one.
	 */
	async findWorkflowsByNodeType(
		projectIds: string[],
		nodeType: string,
		limit: number,
		options: { includeArchived?: boolean } = {},
	): Promise<Array<{ workflowId: string; name: string; updatedAt: Date }>> {
		if (projectIds.length === 0) return [];

		const query = this.createQueryBuilder('dependency')
			.innerJoin('shared_workflow', 'shared', 'shared.workflowId = dependency.workflowId')
			.innerJoin('workflow_entity', 'workflow', 'workflow.id = dependency.workflowId')
			.select('dependency.workflowId', 'workflowId')
			.addSelect('MAX(workflow.name)', 'name')
			// Newest first: the freshest example is the one worth reading for current house style.
			.addSelect('MAX(workflow.updatedAt)', 'updatedAt')
			.where('dependency.dependencyType = :type', { type: 'nodeType' })
			.andWhere('dependency.dependencyKey = :nodeType', { nodeType })
			.andWhere('dependency.publishedVersionId IS NULL')
			.andWhere('shared.projectId IN (:...projectIds)', { projectIds })
			.groupBy('dependency.workflowId')
			.orderBy('MAX(workflow.updatedAt)', 'DESC')
			.limit(limit);

		if (!options.includeArchived) {
			query.andWhere('workflow.isArchived = :archived', { archived: false });
		}

		const rows = await query.getRawMany<{
			workflowId: string;
			name: string;
			updatedAt: Date | string;
		}>();
		return rows.map((row) => ({
			workflowId: row.workflowId,
			name: row.name,
			// SQLite hands back the stored string; Postgres hands back a Date.
			updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
		}));
	}

	/**
	 * Replace the dependencies for a given workflow.
	 * Uses the workflowVersionId to ensure consistency between the workflow and dependency tables.
	 * @param workflowId the id of the workflow
	 * @param dependencies the new dependencies to be written
	 * @returns whether the update was applied
	 */
	async updateDependenciesForWorkflow(
		workflowId: string,
		dependencies: WorkflowDependencies,
	): Promise<boolean> {
		return await this.manager.transaction(async (tx) => {
			return await this.executeUpdate(workflowId, dependencies, tx);
		});
	}

	private async executeUpdate(
		workflowId: string,
		dependencies: WorkflowDependencies,
		tx: EntityManager,
	): Promise<boolean> {
		const deleteResult = await tx.delete(WorkflowDependency, {
			workflowId,
			workflowVersionId: LessThan(dependencies.workflowVersionId),
			// NOTE: this relies on the fact that we only want to track the latest published version or draft dependencies.
			// If we're updating published dependencies, checking for Not Null works because we don't actually
			// care about the specific previous published version id.
			publishedVersionId: dependencies.publishedVersionId ? Not(IsNull()) : IsNull(),
		});

		// If we deleted something, the incoming version is newer - proceed with insert
		if (deleteResult.affected && deleteResult.affected > 0) {
			// NOTE: we cast to any[] because TypeORM doesn't like the JSON column.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await tx.insert(WorkflowDependency, dependencies.dependencies as any[]);
			return true;
		}

		// Nothing was deleted - either no existing data, or existing data is newer/same version
		// Check if any dependencies exist for this workflow. We lock for update to avoid a race
		// when two processes try to insert dependencies for the same workflow at the same time.
		const hasData = await this.acquireLockAndCheckForExistingData(
			workflowId,
			dependencies.publishedVersionId,
			tx,
		);

		if (!hasData) {
			// There's no existing data, so we can safely insert the new dependencies.
			const entities = dependencies.dependencies.map((dep) => this.create(dep));
			// NOTE: we cast to any[] because TypeORM doesn't like the JSON column.
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			await tx.insert(WorkflowDependency, entities as any[]);
			return true;
		}

		// Existing data has same or newer version - skip update
		return false;
	}

	/**
	 * Remove dependencies for a given workflow.
	 *
	 * This removes both draft and published dependencies.
	 *
	 * NOTE: there's a possible race in case of an update and delete happening concurrently.
	 * The delete could be reflected in the database, but the update could be reflected in the index.
	 * To prevent this we would need to implement some tombstone mechanism. However, since we don't
	 * do this for the workflow itself, it would be inconsistent to do it only for the dependencies.
	 * The chance of this happening in practice is also very low.
	 *
	 * @param workflowId The ID of the workflow
	 * @returns Whether any dependencies were removed
	 */
	async removeDependenciesForWorkflow(workflowId: string): Promise<boolean> {
		return await this.manager.transaction(async (tx) => {
			const deleteResult = await tx.delete(WorkflowDependency, { workflowId });

			return (
				deleteResult.affected !== undefined &&
				deleteResult.affected !== null &&
				deleteResult.affected > 0
			);
		});
	}

	private async acquireLockAndCheckForExistingData(
		workflowId: string,
		publishedVersionId: string | null,
		tx: EntityManager,
	): Promise<boolean> {
		// Build where conditions with publishedVersionId filter
		const whereConditions: Record<string, unknown> = {
			workflowId,
			publishedVersionId: publishedVersionId ?? IsNull(),
		};

		if (this.databaseConfig.type === 'sqlite') {
			// We skip the explicit locking here. SQLite locks the entire database for writes,
			// so the prepareTransactionForSqlite step ensures no concurrent writes happen.
			return await tx.existsBy(WorkflowDependency, whereConditions);
		}
		// For Postgres we lock on the workflow row, and only then check the dependency table.
		// This prevents a race between two concurrent updates.
		const placeholder = this.databaseConfig.type === 'postgresdb' ? '$1' : '?';
		const tableName = this.getTableName('workflow_entity');
		await tx.query(`SELECT id FROM ${tableName} WHERE id = ${placeholder} FOR UPDATE`, [
			workflowId,
		]);
		return await tx.existsBy(WorkflowDependency, whereConditions);
	}

	private getTableName(name: string): string {
		const { tablePrefix } = this.databaseConfig;
		return this.manager.connection.driver.escape(`${tablePrefix}${name}`);
	}
}
