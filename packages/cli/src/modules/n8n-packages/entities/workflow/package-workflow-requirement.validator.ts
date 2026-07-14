import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { PackageExportBlockedError } from '../package-export.errors';
import { extractSubWorkflowRequirements } from './sub-workflow-requirements';

const MAX_DISPLAYED_MISSING_WORKFLOWS = 20;

@Service()
export class PackageWorkflowRequirementValidator {
	constructor(private readonly workflowFinder: WorkflowFinderService) {}

	async validateStaticSubWorkflowsIncluded(
		user: User,
		exportedWorkflowIds: Set<string>,
	): Promise<void> {
		const missingSubWorkflowIds = new Set<string>();

		for (const workflowId of exportedWorkflowIds) {
			const workflow = await this.workflowFinder.findWorkflowForUser(workflowId, user, [
				'workflow:export',
			]);

			if (!workflow) {
				missingSubWorkflowIds.add(workflowId);
				continue;
			}

			for (const reference of extractSubWorkflowRequirements(workflow)) {
				if (!exportedWorkflowIds.has(reference.referencedWorkflowId)) {
					missingSubWorkflowIds.add(reference.referencedWorkflowId);
				}
			}
		}

		if (missingSubWorkflowIds.size === 0) return;

		const displayedWorkflowIds = [...missingSubWorkflowIds].slice(
			0,
			MAX_DISPLAYED_MISSING_WORKFLOWS,
		);
		const omittedCount = missingSubWorkflowIds.size - displayedWorkflowIds.length;
		const dependencyLabel = missingSubWorkflowIds.size === 1 ? 'dependency' : 'dependencies';

		throw new PackageExportBlockedError(
			`${missingSubWorkflowIds.size} sub-workflow ${dependencyLabel} not included in the package. Export aborted.`,
			{
				description: `Sub-workflow IDs not included in the package: ${displayedWorkflowIds.join(', ')}${
					omittedCount > 0 ? `, and ${omittedCount} more` : ''
				}`,
			},
		);
	}
}
