import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { WorkflowSubWorkflowRequirement } from './workflow.types';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageWorkflowRequirement } from '../../spec/requirements.schema';

export interface WorkflowRequirementExportRequest {
	user: User;
	requirements: WorkflowSubWorkflowRequirement[];
	workflows: ManifestEntry[];
}

export interface WorkflowRequirementExportResult {
	requirements: PackageWorkflowRequirement[];
}

@Service()
export class WorkflowRequirementExporter {
	constructor(private readonly workflowFinder: WorkflowFinderService) {}

	async export(
		request: WorkflowRequirementExportRequest,
	): Promise<WorkflowRequirementExportResult> {
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

		const missingWorkflowNamesById = await this.findMissingReferencedWorkflowNames(
			request.user,
			[...usedByWorkflowsByReferencedId.keys()].filter((id) => !workflowsById.has(id)),
		);

		const requirements = [...usedByWorkflowsByReferencedId].map(
			([referencedWorkflowId, usedByWorkflows]) => {
				const name =
					workflowsById.get(referencedWorkflowId)?.name ??
					missingWorkflowNamesById.get(referencedWorkflowId);

				return {
					id: referencedWorkflowId,
					...(name ? { name } : {}),
					usedByWorkflows,
				};
			},
		);

		return { requirements };
	}

	/**
	 * Best-effort names for referenced workflows that are not in the package
	 * (only possible under the reference-only policy); ids the user cannot
	 * access stay nameless.
	 */
	private async findMissingReferencedWorkflowNames(
		user: User,
		workflowIds: string[],
	): Promise<Map<string, string>> {
		if (workflowIds.length === 0) return new Map();

		const workflows = await this.workflowFinder.findWorkflowsByIdsForUser(workflowIds, user, [
			'workflow:export',
		]);
		return new Map(workflows.map((workflow) => [workflow.id, workflow.name]));
	}
}
