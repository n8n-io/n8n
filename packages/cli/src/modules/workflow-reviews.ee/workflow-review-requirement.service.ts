import type { WorkflowReviewRequirementLevel } from '@n8n/api-types';
import { ProjectWorkflowReviewSettingsRepository, SharedWorkflowRepository } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowReviewFeatureGate } from './workflow-review-feature-gate.service';

@Service()
export class WorkflowReviewRequirementService {
	constructor(
		private readonly featureGate: WorkflowReviewFeatureGate,
		private readonly sharedWorkflowRepository: SharedWorkflowRepository,
		private readonly projectSettingsRepository: ProjectWorkflowReviewSettingsRepository,
	) {}

	/**
	 * The highest level that requires an approved review to publish a new version of the
	 * workflow, or `null` when no level requires one.
	 */
	async getReviewRequirement(workflowId: string): Promise<WorkflowReviewRequirementLevel | null> {
		const policy = await this.featureGate.getAvailablePolicy();
		if (!policy) return null;

		const project = await this.sharedWorkflowRepository.getWorkflowOwningProject(workflowId);
		if (project?.type === 'personal') return null;

		// An unknown owner counts as a team project, so the instance rule fails closed.
		if (policy.alwaysRequired === true) return 'instance';
		if (!project) return null;

		const { requiredByInstance, requiredByProject } =
			await this.projectSettingsRepository.getRequirements(project.id, {});
		if (requiredByInstance) return 'instance';
		return requiredByProject ? 'project' : null;
	}
}
