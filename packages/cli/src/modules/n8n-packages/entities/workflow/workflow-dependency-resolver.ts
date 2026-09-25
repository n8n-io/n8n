import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { extractWorkflowRequirements } from './references/extract-workflow-requirements';
import { applyWorkflowVersionPolicy, needsActiveVersion } from './workflow-version-policy';
import type { WorkflowSubWorkflowRequirement } from './workflow.types';
import type { WorkflowVersionPolicy } from '../../n8n-packages.types';

export interface WorkflowDependencyResolveRequest {
	user: User;
	workflowIds: string[];
	/**
	 * How far to follow static sub-workflow references: `transitive` (default)
	 * walks the whole reference graph, `direct` stops after the requested
	 * workflows' own references.
	 */
	traversal?: 'transitive' | 'direct';
	workflowVersionPolicy: WorkflowVersionPolicy;
}

@Service()
export class WorkflowDependencyResolver {
	constructor(private readonly workflowFinder: WorkflowFinderService) {}

	async resolve(
		request: WorkflowDependencyResolveRequest,
	): Promise<WorkflowSubWorkflowRequirement[]> {
		const traverse = (request.traversal ?? 'transitive') === 'transitive';
		const policy = request.workflowVersionPolicy;
		const queue = [...new Set(request.workflowIds)];
		const seenWorkflowIds = new Set(queue);
		const requirements: WorkflowSubWorkflowRequirement[] = [];

		while (queue.length > 0) {
			const workflowIds = queue.splice(0);

			const loaded = await this.workflowFinder.findWorkflowsByIdsForUser(
				workflowIds,
				request.user,
				['workflow:export'],
				{ includeActiveVersion: needsActiveVersion(policy) },
			);
			const workflows = applyWorkflowVersionPolicy(loaded, policy);
			const workflowsById = new Map(workflows.map((workflow) => [workflow.id, workflow]));

			for (const workflowId of workflowIds) {
				const workflow = workflowsById.get(workflowId);

				// This prevents exposing and traversing through workflows that should not be visible to user.
				// But the missing/inaccessible IDs are kept as direct requirements from their parent.
				if (!workflow) continue;

				const extractedRequirements = extractWorkflowRequirements(workflow);
				requirements.push(...extractedRequirements);

				if (!traverse) continue;

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
