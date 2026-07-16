import { PackageExportBlockedError } from '../package-export.errors';
import type { WorkflowWorkflowRequirement } from './workflow.types';

const MAX_DISPLAYED_MISSING_WORKFLOWS = 20;

export function assertWorkflowDependenciesIncluded(
	workflowRequirements: WorkflowWorkflowRequirement[],
	exportedWorkflowIds: Set<string>,
): void {
	const missingWorkflowIds = new Set<string>();

	for (const requirement of workflowRequirements) {
		if (!exportedWorkflowIds.has(requirement.referencedWorkflowId)) {
			missingWorkflowIds.add(requirement.referencedWorkflowId);
		}
	}

	if (missingWorkflowIds.size === 0) return;

	const displayedWorkflowIds = [...missingWorkflowIds].slice(0, MAX_DISPLAYED_MISSING_WORKFLOWS);
	const omittedCount = missingWorkflowIds.size - displayedWorkflowIds.length;
	const dependencyLabel = missingWorkflowIds.size === 1 ? 'dependency' : 'dependencies';

	throw new PackageExportBlockedError(
		`${missingWorkflowIds.size} workflow ${dependencyLabel} not included in the package. Export aborted.`,
		{
			description: `Workflow IDs not included in the package: ${displayedWorkflowIds.join(', ')}${
				omittedCount > 0 ? `, and ${omittedCount} more` : ''
			}`,
		},
	);
}
