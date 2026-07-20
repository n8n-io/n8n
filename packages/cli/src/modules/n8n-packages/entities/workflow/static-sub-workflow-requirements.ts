import { PackageExportBlockedError } from '../package-export.errors';
import type { WorkflowSubWorkflowRequirement } from './workflow.types';

const MAX_DISPLAYED_MISSING_WORKFLOWS = 20;

export function assertStaticSubWorkflowsIncluded(
	workflowRequirements: WorkflowSubWorkflowRequirement[],
	exportedWorkflowIds: Set<string>,
): void {
	const missingSubWorkflowIds = new Set<string>();

	for (const requirement of workflowRequirements) {
		if (!exportedWorkflowIds.has(requirement.referencedWorkflowId)) {
			missingSubWorkflowIds.add(requirement.referencedWorkflowId);
		}
	}

	if (missingSubWorkflowIds.size === 0) return;

	const displayedWorkflowIds = [...missingSubWorkflowIds].slice(0, MAX_DISPLAYED_MISSING_WORKFLOWS);
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
