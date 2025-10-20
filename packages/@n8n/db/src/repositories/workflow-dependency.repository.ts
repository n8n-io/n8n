import { Service } from '@n8n/di';
import { DataSource, Repository, LessThan } from '@n8n/typeorm';

import type { DependencyType } from '../entities';
import { WorkflowDependency } from '../entities';

type DependencyInput = {
	workflowId: string;
	workflowVersionId: number;
	dependencyType: DependencyType;
	dependencyKey: string;
	dependencyInfo: string | null;
	indexVersionId: number;
};

@Service()
export class WorkflowDependencyRepository extends Repository<WorkflowDependency> {
	constructor(dataSource: DataSource) {
		super(WorkflowDependency, dataSource.manager);
	}

	/**
	 * Replace all dependencies for a workflow with new ones.
	 * Only updates if the incoming workflowVersionId is greater than existing dependencies.
	 * This prevents stale updates from overwriting newer data.
	 *
	 * @returns true if dependencies were updated, false if update was skipped due to version check
	 */
	async replaceWorkflowDependencies(
		workflowId: string,
		dependencies: DependencyInput[],
	): Promise<boolean> {
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
	private validateDependencies(dependencies: DependencyInput[]): number {
		if (dependencies.length === 0) {
			throw new Error('Dependencies array must not be empty');
		}

		const versionId = dependencies[0].workflowVersionId;

		const allSameVersion = dependencies.every((dep) => dep.workflowVersionId === versionId);
		if (!allSameVersion) {
			throw new Error('All dependencies must have the same workflowVersionId');
		}

		return versionId;
	}
}
