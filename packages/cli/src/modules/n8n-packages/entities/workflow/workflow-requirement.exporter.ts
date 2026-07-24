import { Service } from '@n8n/di';

import type { WorkflowSubWorkflowRequirement } from './workflow.types';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageWorkflowRequirement } from '../../spec/requirements.schema';

export interface WorkflowRequirementExportRequest {
	requirements: WorkflowSubWorkflowRequirement[];
	workflows: ManifestEntry[];
}

export interface WorkflowRequirementExportResult {
	requirements: PackageWorkflowRequirement[];
}

@Service()
export class WorkflowRequirementExporter {
	export(request: WorkflowRequirementExportRequest): WorkflowRequirementExportResult {
		const workflowsById = new Map(request.workflows.map((workflow) => [workflow.id, workflow]));
		const usedByWorkflowsByReferencedId = new Map<string, string[]>();

		for (const requirement of request.requirements) {
			const usedByWorkflows =
				usedByWorkflowsByReferencedId.get(requirement.referencedWorkflowId) ?? [];

			if (!usedByWorkflows.includes(requirement.workflowId)) {
				usedByWorkflows.push(requirement.workflowId);
			}

			usedByWorkflowsByReferencedId.set(requirement.referencedWorkflowId, usedByWorkflows);
		}

		const requirements = [...usedByWorkflowsByReferencedId].map(
			([referencedWorkflowId, usedByWorkflows]) => ({
				id: referencedWorkflowId,
				name: workflowsById.get(referencedWorkflowId)?.name ?? '',
				usedByWorkflows,
			}),
		);

		return { requirements };
	}
}
