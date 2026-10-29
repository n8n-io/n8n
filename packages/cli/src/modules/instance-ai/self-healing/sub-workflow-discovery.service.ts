import {
	SharedWorkflowRepository,
	WorkflowDependencyRepository,
	WorkflowRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { ACTOR_SCOPES } from './self-healing-configuration.service';

export type DiscoveredSubWorkflow = {
	id: string;
	name: string;
	published: boolean;
};

export type SubWorkflowDiscovery = {
	subWorkflows: DiscoveredSubWorkflow[];
	excluded: {
		inaccessible: number;
		otherProject: number;
	};
};

@Service()
export class SubWorkflowDiscoveryService {
	constructor(
		private readonly workflowFinder: WorkflowFinderService,
		private readonly ownership: SharedWorkflowRepository,
		private readonly workflows: WorkflowRepository,
		private readonly dependencies: WorkflowDependencyRepository,
	) {}

	async discover(
		user: User,
		projectId: string,
		workflowIds: string[],
	): Promise<SubWorkflowDiscovery> {
		const rootIds = new Set(workflowIds);
		const visited = new Set(rootIds);
		const result: SubWorkflowDiscovery = {
			subWorkflows: [],
			excluded: { inaccessible: 0, otherProject: 0 },
		};

		let level = [...rootIds];
		while (level.length > 0) {
			const accessible = await this.workflowFinder.findWorkflowIdsWithScopeForUser(
				level,
				user,
				ACTOR_SCOPES,
			);
			const owners = await this.ownership.findOwnerProjectsByWorkflowIds([...accessible]);
			const inProject = level.filter((id) => owners.get(id)?.id === projectId);
			const workflows = await this.workflows.findByIds(inProject, {
				fields: ['name', 'activeVersionId'],
			});
			const publishedVersionIds = workflows.flatMap(({ activeVersionId }) =>
				activeVersionId ? [activeVersionId] : [],
			);
			const calls = await this.dependencies.findWorkflowCalls(publishedVersionIds);

			for (const workflowId of level) {
				if (rootIds.has(workflowId)) continue;
				if (!accessible.has(workflowId)) result.excluded.inaccessible++;
				else if (owners.get(workflowId)?.id !== projectId) result.excluded.otherProject++;
			}

			for (const workflow of workflows) {
				if (rootIds.has(workflow.id)) continue;
				result.subWorkflows.push({
					id: workflow.id,
					name: workflow.name,
					published: workflow.activeVersionId !== null,
				});
			}

			const next: string[] = [];
			for (const { calledWorkflowId } of calls) {
				if (visited.has(calledWorkflowId)) continue;
				visited.add(calledWorkflowId);
				next.push(calledWorkflowId);
			}

			level = next;
		}

		return result;
	}
}
