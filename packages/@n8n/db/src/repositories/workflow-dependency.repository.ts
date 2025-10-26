import { DatabaseConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { DataSource, LessThan, Repository } from '@n8n/typeorm';

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
	 * @param workflowVersionId the version counter of the workflow
	 * @param dependencies the new dependencies to be written
	 * @returns whether the update was applied
	 */
	async updateDependenciesForWorkflow(
		workflowId: string,
		dependencies: WorkflowDependencies,
	): Promise<boolean> {
		return await this.manager.transaction(async (tx) => {
			// Delete only dependencies with older versions
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
			const hasExistingData =
				this.databaseConfig.type === 'sqlite'
					? // sqlite doesn't support lock modes because it just locks the whole database for writes
						await tx.exists(WorkflowDependency, { where: { workflowId } })
					: await tx.exists(WorkflowDependency, {
							where: { workflowId },
							lock: { mode: 'pessimistic_write' },
						});

			if (hasExistingData) {
				// No existing data - proceed with insert
				const entities = dependencies.dependencies.map((dep) => this.create(dep));
				await tx.insert(WorkflowDependency, entities);
				return true;
			}

			// Existing data has same or newer version - skip update
			return false;
		});
	}

	/**
	 * Remove all dependencies for a given workflow.
	 *
	 * TODO: there's a possible race condition here if a workflow is concurrently deleted and also re-inserted.
	 * We could protect against this by tombstone-ing deleted workflows, but for now we accept the risk, because:
	 * - This would involve changing the whole way we delete workflows.
	 * - The access patterns make this unlikely to be an issue in practice.
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
}
