import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import type { WorkflowDependencyRequirement } from './workflow.types';
import type { ManifestEntry } from '../../spec/manifest.schema';
import type { PackageWorkflowRequirement } from '../../spec/requirements.schema';
import { groupRequirementUsage } from '../requirement-source';

export interface WorkflowRequirementExportRequest {
	user: User;
	requirements: WorkflowDependencyRequirement[];
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
		const usageByReferencedId = groupRequirementUsage(
			request.requirements,
			({ referencedWorkflowId }) => referencedWorkflowId,
		);

		const missingWorkflowNamesById = await this.findMissingReferencedWorkflowNames(
			request.user,
			[...usageByReferencedId.keys()].filter((id) => !workflowsById.has(id)),
		);

		const requirements = [...usageByReferencedId].map(
			([referencedWorkflowId, { usedBy }]): PackageWorkflowRequirement => {
				const name =
					workflowsById.get(referencedWorkflowId)?.name ??
					missingWorkflowNamesById.get(referencedWorkflowId);

				return {
					id: referencedWorkflowId,
					...(name ? { name } : {}),
					usedBy,
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
