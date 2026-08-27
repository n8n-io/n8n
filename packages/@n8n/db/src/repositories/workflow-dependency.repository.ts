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
	 * How many of the given workflows use each node type, most-used first.
	 *
	 * Reads the draft rows (`publishedVersionId IS NULL`) so the answer describes
	 * what the workflows currently contain rather than what was last published.
	 * Counts DISTINCT workflows, not node instances: three HTTP Request nodes in
	 * one workflow are one user of the node type, which is the question callers
	 * are actually asking.
	 *
	 * The caller supplies the workflow ids it has already authorized, so this adds
	 * no access checks of its own.
	 */
	async countWorkflowsByNodeType(
		workflowIds: string[],
	): Promise<Array<{ nodeType: string; workflowCount: number }>> {
		if (workflowIds.length === 0) return [];

		const rows = await this.createQueryBuilder('dep')
			.select('dep.dependencyKey', 'nodeType')
			.addSelect('COUNT(DISTINCT dep.workflowId)', 'workflowCount')
			.where('dep.dependencyType = :depType', { depType: 'nodeType' })
			.andWhere('dep.publishedVersionId IS NULL')
			.andWhere('dep.workflowId IN (:...workflowIds)', { workflowIds })
			.groupBy('dep.dependencyKey')
			.orderBy('COUNT(DISTINCT dep.workflowId)', 'DESC')
			.addOrderBy('dep.dependencyKey', 'ASC')
			.getRawMany<{ nodeType: string; workflowCount: string | number }>();

		// Aggregates come back as strings on some drivers.
		return rows.map((row) => ({
			nodeType: row.nodeType,
			workflowCount: Number(row.workflowCount),
		}));
	}

	/**
	 * Which of the given workflows use each of the named node types.
	 *
	 * Same draft-row scoping as `countWorkflowsByNodeType`. Returned as pairs
	 * rather than a map so the caller decides how to group them.
	 */
	async findWorkflowIdsByNodeType(
		workflowIds: string[],
		nodeTypes: string[],
	): Promise<Array<{ nodeType: string; workflowId: string }>> {
		if (workflowIds.length === 0 || nodeTypes.length === 0) return [];

		return await this.createQueryBuilder('dep')
			.select('dep.dependencyKey', 'nodeType')
			.addSelect('dep.workflowId', 'workflowId')
			.distinct(true)
			.where('dep.dependencyType = :depType', { depType: 'nodeType' })
			.andWhere('dep.publishedVersionId IS NULL')
			.andWhere('dep.workflowId IN (:...workflowIds)', { workflowIds })
			.andWhere('dep.dependencyKey IN (:...nodeTypes)', { nodeTypes })
			.getRawMany<{ nodeType: string; workflowId: string }>();
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
