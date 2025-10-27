import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, EntityManager, LessThan, Repository } from '@n8n/typeorm';

import { WorkflowDependency } from '../entities';

/**
 * Helper class to collect workflow dependencies before writing them to the database.
 */
export class WorkflowDependencies {
	readonly dependencies: WorkflowDependency[] = [];

	constructor(
		readonly workflowId: string,
		readonly workflowVersionId: number | undefined,
		readonly indexVersionId: number,
	) {}

	add(dependency: {
		dependencyType: string;
		dependencyKey: string | null;
		dependencyInfo: string;
	}) {
		const dep = new WorkflowDependency();
		Object.assign(dep, dependency);
		Object.assign(dep, {
			workflowId: this.workflowId,
			workflowVersionId: this.workflowVersionId,
			indexVersionId: this.indexVersionId,
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
		if (this.databaseConfig.type === 'sqlite') {
			// SQLite has different concurrency controls, so we handle it slightly differently.
			return await this.updateWithImmediateTransaction(workflowId, dependencies);
		}
		return await this.manager.transaction(async (tx) => {
			return await this.executeUpdate(workflowId, dependencies, tx);
		});
	}

	private async updateWithImmediateTransaction(
		workflowId: string,
		dependencies: WorkflowDependencies,
	): Promise<boolean> {
		// We use a query runner to have more control over the transaction.
		const queryRunner = this.manager.connection.createQueryRunner();
		await queryRunner.connect();

		try {
			// Set a busy_timeout - otherwise the query will fail immediately if the database is locked.
			await queryRunner.query('PRAGMA busy_timeout = 5000');

			// Start an immediate transaction to acquire a RESERVED lock.
			// NOTE: in the typical case where we're updating an existing workflow, this would happen
			// anyway when we delete the existing dependencies. We lock explicitly to make it clearer,
			// and ensure nothing weird happens when there are no existing dependencies.
			await queryRunner.query('BEGIN IMMEDIATE');

			// Perform the update using queryRunner.manager
			const result = await this.executeUpdate(workflowId, dependencies, queryRunner.manager);

			await queryRunner.commitTransaction();
			return result;
		} catch (error) {
			await queryRunner.rollbackTransaction();
			throw error;
		} finally {
			await queryRunner.release();
		}
	}

	private async executeUpdate(
		workflowId: string,
		dependencies: WorkflowDependencies,
		tx: EntityManager,
	): Promise<boolean> {
		const deleteResult = await tx.delete(WorkflowDependency, {
			workflowId,
			workflowVersionId: LessThan(dependencies.workflowVersionId),
		});

		// If we deleted something, the incoming version is newer - proceed with insert
		if (deleteResult.affected && deleteResult.affected > 0) {
			const entities = dependencies.dependencies.map((dep) => this.create(dep));
			await tx.insert(WorkflowDependency, entities);
			return true;
		}

		// Nothing was deleted - either no existing data, or existing data is newer/same version
		// Check if any dependencies exist for this workflow. We lock for update to avoid a race
		// when two processes try to insert dependencies for the same workflow at the same time.
		const hasData = await this.hasExistingData(workflowId, tx);

		if (!hasData) {
			// There's no existing data, so we can
			const entities = dependencies.dependencies.map((dep) => this.create(dep));
			await tx.insert(WorkflowDependency, entities);
			return true;
		}

		// Existing data has same or newer version - skip update
		return false;
	}

	/**
	 * Remove all dependencies for a given workflow.
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

	private async hasExistingData(workflowId: string, tx: EntityManager): Promise<boolean> {
		if (this.databaseConfig.type === 'sqlite') {
			// We skip the explicit locking here. SQLite locks the entire database for writes,
			// so the prepareTransactionForSqlite step ensures no concurrent writes happen.
			const count = await tx.count(WorkflowDependency, { where: { workflowId } });
			return count > 0;
		}
		// For Postgres and MySQL we lock on the workflow row, and only then check the dependency table.
		// This prevents a race between two concurrent updates.
		await tx.query('SELECT id FROM workflow WHERE id = ? FOR UPDATE', [workflowId]);
		const count = await tx.count(WorkflowDependency, { where: { workflowId } });
		return count > 0;
	}
}
