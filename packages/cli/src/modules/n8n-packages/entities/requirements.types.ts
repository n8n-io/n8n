import type { WorkflowCredentialRequirement } from './credential/credential.types';
import type { PackageSubWorkflowRequirement } from '../spec/requirements.schema';

export interface WorkflowExportRequirements {
	credentials: WorkflowCredentialRequirement[];
	subWorkflows?: WorkflowSubWorkflowRequirement[];
}

export interface WorkflowSubWorkflowRequirement {
	workflowId: string;
	subWorkflowId: string;
	name: string;
}

export const mergeRequirements = (
	...parts: Array<WorkflowExportRequirements | undefined>
): WorkflowExportRequirements => ({
	credentials: parts.flatMap((part) => part?.credentials ?? []),
	subWorkflows: parts.flatMap((part) => part?.subWorkflows ?? []),
});

export function toPackageSubWorkflowRequirements(
	requirements: WorkflowSubWorkflowRequirement[],
): PackageSubWorkflowRequirement[] {
	const byId = new Map<string, PackageSubWorkflowRequirement>();

	for (const requirement of requirements) {
		const existing = byId.get(requirement.subWorkflowId);

		if (!existing) {
			byId.set(requirement.subWorkflowId, {
				id: requirement.subWorkflowId,
				name: requirement.name,
				usedByWorkflows: [requirement.workflowId],
			});
			continue;
		}

		existing.usedByWorkflows = unique([...existing.usedByWorkflows, requirement.workflowId]);
	}

	return [...byId.values()];
}

function unique(values: string[]): string[] {
	return [...new Set(values)];
}
