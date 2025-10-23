import { Service } from '@n8n/di';
import { DataSource, LessThan, Repository } from '@n8n/typeorm';

import { WorkflowDependency } from '../entities';

@Service()
export class WorkflowDependencyRepository extends Repository<WorkflowDependency> {
	constructor(dataSource: DataSource) {
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
		dependencies: WorkflowDependency[],
	): Promise<boolean> {
		// Handle empty dependencies (cleanup scenario)
		if (dependencies.length === 0) {
			return await this.manager.transaction(async (tx) => {
				const deleteResult = await tx.delete(WorkflowDependency, { workflowId });
				return deleteResult.affected !== undefined && deleteResult.affected > 0;
			});
		}

		const incomingVersionId = this.validateDependencies(dependencies);
		return await this.manager.transaction(async (tx) => {
			// Delete only dependencies with older versions
			const deleteResult = await tx.delete(WorkflowDependency, {
				workflowId,
				workflowVersionId: LessThan(incomingVersionId),
			});

			// If we deleted something, the incoming version is newer - proceed with insert
			if (deleteResult.affected && deleteResult.affected > 0) {
				const entities = dependencies.map((dep) => this.create(dep));
				await tx.insert(WorkflowDependency, entities);
				return true;
			}

			// Nothing was deleted - either no existing data, or existing data is newer/same version
			// Check if any dependencies exist for this workflow
			const existingCount = await tx.count(WorkflowDependency, { where: { workflowId } });

			if (existingCount === 0) {
				// No existing data - proceed with insert
				const entities = dependencies.map((dep) => this.create(dep));
				await tx.insert(WorkflowDependency, entities);
				return true;
			}

			// Existing data has same or newer version - skip update
			return false;
		});
	}
	/**
	 * Validates that dependencies array is non-empty and all items have the same workflowVersionId.
	 * @returns The workflowVersionId from the dependencies
	 * @throws Error if validation fails
	 */
	private validateDependencies(dependencies: WorkflowDependency[]): number {
		const versionId = dependencies[0].workflowVersionId;

		const allSameVersion = dependencies.every((dep) => dep.workflowVersionId === versionId);
		if (!allSameVersion) {
			throw new Error('All dependencies must have the same workflowVersionId');
		}

		return versionId;
	}
}
