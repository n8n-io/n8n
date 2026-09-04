import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, IsNull, LessThan, Repository, Not } from '@n8n/typeorm';

import { SharedWorkflowRepository } from './shared-workflow.repository';
import type { User } from '../entities';
import { WorkflowDependency, WorkflowEntity } from '../entities';

const INDEX_VERSION_ID = 1;

/**
 * Which workflows an aggregate over the index may span. The roles come from the caller
 * because they are derived from scopes, which live above this layer; everything else about
 * readability is decided here by the same subquery the workflow listing uses.
 */
export interface NodeUsageScope {
	/** Project roles carrying `workflow:read`, as `RoleService.rolesWithScope` returns them. */
	projectRoles: string[];
	/** Workflow roles carrying `workflow:read`. */
	workflowRoles: string[];
	/** Narrow to a single project. Omit to span every project the user can read. */
	projectId?: string;
}

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
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
	) {
		super(WorkflowDependency, dataSource.manager);
	}

	/**
	 * How many workflows in scope use each node type, most-used first.
	 *
	 * Answers "what does this project reach for" from the index instead of by fetching every
	 * workflow and reading its nodes, which is the only other route: the workflow listing filters
	 * on name alone.
	 */
	async countNodeTypeUsage(
		user: User,
		scope: NodeUsageScope,
		limit: number,
	): Promise<{
		workflowsInScope: number;
		nodeTypes: Array<{ nodeType: string; workflowCount: number }>;
		truncated: boolean;
	}> {
		const rows = await this.buildScopedDependencyQuery(user, scope)
			.andWhere('dependency.dependencyType = :dependencyType', { dependencyType: 'nodeType' })
			.select('dependency.dependencyKey', 'nodeType')
			// DISTINCT because three HTTP Request nodes in one workflow are one user of the type,
			// and because a workflow shared into several projects matches the scope subquery once
			// per row it holds there.
			.addSelect('COUNT(DISTINCT dependency.workflowId)', 'workflowCount')
			.groupBy('dependency.dependencyKey')
			.orderBy('COUNT(DISTINCT dependency.workflowId)', 'DESC')
			.addOrderBy('dependency.dependencyKey', 'ASC')
			// One over the limit, so a cut list is reported as cut rather than guessed at. The
			// histogram has to be bounded: an instance-wide read on a large estate would otherwise
			// return hundreds of rows, which is the cost this surface exists to avoid.
			.limit(limit + 1)
			.getRawMany<{ nodeType: string; workflowCount: number | string }>();

		// Two queries, not one transaction: the counts and the denominator can disagree by a
		// workflow if one is written between them. Reading both here still beats making every
		// caller pair them up, and the drift is a row, not a wrong shape.
		const workflowsInScope = await this.countWorkflowsInScope(user, scope);

		return {
			workflowsInScope,
			nodeTypes: rows.slice(0, limit).map((row) => ({
				nodeType: row.nodeType,
				workflowCount: Number(row.workflowCount),
			})),
			truncated: rows.length > limit,
		};
	}

	/**
	 * How many workflows the counts are out of. Every indexed workflow carries at least a
	 * `workflowIndexed` placeholder row, so counting index rows without a type filter counts
	 * workflows; one not yet indexed is absent from the numerator and the denominator alike.
	 */
	async countWorkflowsInScope(user: User, scope: NodeUsageScope): Promise<number> {
		const total = await this.buildScopedDependencyQuery(user, scope)
			.select('COUNT(DISTINCT dependency.workflowId)', 'total')
			.getRawOne<{ total: number | string }>();

		// Postgres returns COUNT as a bigint string.
		return Number(total?.total ?? 0);
	}

	/**
	 * Which workflows in scope use a given node type, most recently updated first.
	 *
	 * The rung below the histogram: once it says a node type is the house choice, this says which
	 * workflow to read as the current example.
	 */
	async findWorkflowsUsingNodeType(
		user: User,
		scope: NodeUsageScope,
		nodeType: string,
		limit: number,
	): Promise<Array<{ workflowId: string; name: string; updatedAt: Date }>> {
		const rows = await this.buildScopedDependencyQuery(user, scope)
			.andWhere('dependency.dependencyType = :dependencyType', { dependencyType: 'nodeType' })
			.andWhere('dependency.dependencyKey = :nodeType', { nodeType })
			.select('dependency.workflowId', 'workflowId')
			// Grouped because the same workflow can hold several rows for one node type, so the
			// aggregates pick a single name and timestamp per workflow.
			.addSelect('MAX(workflow.name)', 'name')
			.addSelect('MAX(workflow.updatedAt)', 'updatedAt')
			.groupBy('dependency.workflowId')
			.orderBy('MAX(workflow.updatedAt)', 'DESC')
			.limit(limit)
			.getRawMany<{ workflowId: string; name: string; updatedAt: Date | string }>();

		return rows.map((row) => ({
			workflowId: row.workflowId,
			name: row.name,
			// SQLite hands back the stored string; Postgres hands back a Date.
			updatedAt: row.updatedAt instanceof Date ? row.updatedAt : new Date(row.updatedAt),
		}));
	}

	/**
	 * Index rows the user may read, scoped by the same subquery the workflow listing is built on
	 * (`SharedWorkflowRepository.buildSharedWorkflowIdsSubquery`) rather than by a list of ids the
	 * caller resolved first. Reusing it keeps this on one access path — a second one is the likeliest
	 * thing here to drift into a leak — and keeps the scope out of the bind parameters, so the query
	 * does not grow with the estate.
	 */
	private buildScopedDependencyQuery(user: User, scope: NodeUsageScope) {
		const readable = this.sharedWorkflowRepository.buildSharedWorkflowIdsSubquery(user, {
			projectRoles: scope.projectRoles,
			workflowRoles: scope.workflowRoles,
			...(scope.projectId ? { projectId: scope.projectId } : {}),
		});

		return (
			this.createQueryBuilder('dependency')
				.innerJoin(WorkflowEntity, 'workflow', 'workflow.id = dependency.workflowId')
				// Draft rows describe what a workflow currently contains; what someone is building is a
				// better statement of preference than what happens to be published.
				.where('dependency.publishedVersionId IS NULL')
				// Archived workflows are what a project used to do.
				.andWhere('workflow.isArchived = :isArchived', { isArchived: false })
				.andWhere(`dependency.workflowId IN (${readable.getQuery()})`)
				.setParameters(readable.getParameters())
		);
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
