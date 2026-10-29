import type { SelfHealingSubWorkflow, SelfHealingSubWorkflowPreview } from '@n8n/api-types';
import {
	SharedWorkflowRepository,
	WorkflowDependencyRepository,
	WorkflowRepository,
	type User,
} from '@n8n/db';
import { Service } from '@n8n/di';

import { WorkflowFinderService } from '@/workflows/workflow-finder.service';

import { ACTOR_SCOPES } from './self-healing-configuration.service';

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
	): Promise<SelfHealingSubWorkflowPreview> {
		const rootIds = [...new Set(workflowIds)];
		const seen = new Set(rootIds);
		const published = new Map<string, SelfHealingSubWorkflow>();
		const inaccessibleIds = new Set<string>();
		const calls = new Map<string, string[]>();

		let level = rootIds;
		while (level.length > 0) {
			const accessible = await this.workflowFinder.findWorkflowIdsWithScopeForUser(
				level,
				user,
				ACTOR_SCOPES,
			);
			const [owners, workflows] = await Promise.all([
				this.ownership.findOwnerProjectsByWorkflowIds([...accessible]),
				this.workflows.findByIds([...accessible], { fields: ['name', 'activeVersionId'] }),
			]);
			const followedVersionIds = workflows.flatMap(({ id, activeVersionId }) =>
				activeVersionId && owners.get(id)?.id === projectId ? [activeVersionId] : [],
			);
			const rows = await this.dependencies.findWorkflowCalls(followedVersionIds);

			for (const workflowId of level) {
				if (!accessible.has(workflowId)) inaccessibleIds.add(workflowId);
			}
			for (const { id, name, activeVersionId } of workflows) {
				if (!activeVersionId) continue;
				published.set(id, { id, name, otherProject: owners.get(id)?.id !== projectId });
			}

			const next: string[] = [];
			for (const { workflowId, calledWorkflowId } of rows) {
				const called = calls.get(workflowId) ?? [];
				called.push(calledWorkflowId);
				calls.set(workflowId, called);
				if (seen.has(calledWorkflowId)) continue;
				seen.add(calledWorkflowId);
				next.push(calledWorkflowId);
			}
			level = next;
		}

		const result: SelfHealingSubWorkflowPreview = {};
		for (const rootId of rootIds) {
			const reached = new Set([rootId]);
			const subWorkflows: SelfHealingSubWorkflow[] = [];
			let inaccessible = 0;
			const pending = [...(calls.get(rootId) ?? [])];
			for (let index = 0; index < pending.length; index++) {
				const workflowId = pending[index];
				if (reached.has(workflowId)) continue;
				reached.add(workflowId);
				if (inaccessibleIds.has(workflowId)) inaccessible++;
				const workflow = published.get(workflowId);
				if (!workflow) continue;
				subWorkflows.push(workflow);
				pending.push(...(calls.get(workflowId) ?? []));
			}
			subWorkflows.sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
			result[rootId] = { subWorkflows, inaccessible };
		}
		return result;
	}
}
