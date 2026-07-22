import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowRequirementsExtractor } from './workflow-requirements.extractor';
import type { WorkflowSubWorkflowRequirement } from './workflow.types';

export interface WorkflowDependencyResolveRequest {
	user: User;
	workflowIds: string[];
}

@Service()
export class WorkflowDependencyResolver {
	constructor(
		private readonly workflowFinder: WorkflowFinderService,
		private readonly workflowRequirementsExtractor: WorkflowRequirementsExtractor,
	) {}

	async resolve(
		request: WorkflowDependencyResolveRequest,
	): Promise<WorkflowSubWorkflowRequirement[]> {
		const queue = [...new Set(request.workflowIds)];
		const seenWorkflowIds = new Set(queue);
		const requirements: WorkflowSubWorkflowRequirement[] = [];

		while (queue.length > 0) {
			const workflowIds = queue.splice(0);

			const workflows = await this.workflowFinder.findWorkflowsByIdsForUser(
				workflowIds,
				request.user,
				['workflow:export'],
			);
			const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));

			for (const workflowId of workflowIds) {
				const workflow = workflowsById.get(workflowId);

				// This prevents exposing and traversing through workflows that should not be visible to user.
				// But the missing/inaccessible IDs are kept as direct requirements from their parent.
				if (!workflow) continue;

				const extractedRequirements = this.workflowRequirementsExtractor.extract(workflow);
				requirements.push(...extractedRequirements);

				for (const { referencedWorkflowId } of extractedRequirements) {
					if (seenWorkflowIds.has(referencedWorkflowId)) continue;

					seenWorkflowIds.add(referencedWorkflowId);
					queue.push(referencedWorkflowId);
				}
			}
		}

		return requirements;
	}
}
