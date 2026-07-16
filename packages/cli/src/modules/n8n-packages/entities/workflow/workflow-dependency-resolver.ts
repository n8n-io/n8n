import type { User } from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { WorkflowRequirementsExtractor } from './workflow-requirements.extractor';
import type { WorkflowWorkflowRequirement } from './workflow.types';

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

	async resolve(request: WorkflowDependencyResolveRequest): Promise<WorkflowWorkflowRequirement[]> {
		const queue: string[] = [];
		const queuedIds = new Set<string>();
		const processedIds = new Set<string>();
		const seenRequirements = new Set<string>();
		const requirements: WorkflowWorkflowRequirement[] = [];

		const enqueue = (workflowId: string) => {
			if (processedIds.has(workflowId) || queuedIds.has(workflowId)) return;

			queue.push(workflowId);
			queuedIds.add(workflowId);
		};

		for (const workflowId of request.workflowIds) {
			enqueue(workflowId);
		}

		while (queue.length > 0) {
			const workflowIds = queue.splice(0);
			for (const workflowId of workflowIds) {
				queuedIds.delete(workflowId);
				processedIds.add(workflowId);
			}

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

				for (const requirement of this.workflowRequirementsExtractor.extract(workflow)) {
					const key = this.requirementKey(requirement);
					if (!seenRequirements.has(key)) {
						seenRequirements.add(key);
						requirements.push(requirement);
					}

					enqueue(requirement.referencedWorkflowId);
				}
			}
		}

		return requirements;
	}

	private requirementKey(requirement: WorkflowWorkflowRequirement): string {
		return `${requirement.workflowId}:${requirement.referencedWorkflowId}`;
	}
}
