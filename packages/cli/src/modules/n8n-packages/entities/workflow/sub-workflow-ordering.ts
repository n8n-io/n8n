import type { PackageWorkflowRequirement } from '../../spec/requirements.schema';

/**
 * Reorders workflows so that a sub-workflow dependency is always imported before
 * the workflows that call it, using the manifest's `requirements.workflows` graph.
 *
 * Edges come from each requirement's `usedByWorkflows` (every parent depends on
 * the requirement's `id`). Only ids present in `workflows` participate; unknown
 * ids are ignored. Cycles — including a workflow that calls itself — are
 * tolerated: their members keep a stable relative order rather than looping.
 */
export function orderBySubWorkflowDependencies<T extends { sourceWorkflowId: string }>(
	workflows: T[],
	requirements: PackageWorkflowRequirement[] | undefined,
): T[] {
	if (!requirements?.length) return workflows;

	const dependenciesByWorkflowId = buildDependencyMap(requirements);
	const workflowsById = new Map(workflows.map((workflow) => [workflow.sourceWorkflowId, workflow]));

	const ordered: T[] = [];
	const state = new Map<string, 'visiting' | 'done'>();

	const visit = (workflow: T): void => {
		const id = workflow.sourceWorkflowId;
		// 'visiting' means we re-entered a workflow still on the stack (a cycle) —
		// skip to break it; 'done' means it is already placed.
		if (state.has(id)) return;

		state.set(id, 'visiting');
		for (const dependencyId of dependenciesByWorkflowId.get(id) ?? []) {
			const dependency = workflowsById.get(dependencyId);
			if (dependency) visit(dependency);
		}
		state.set(id, 'done');
		ordered.push(workflow);
	};

	for (const workflow of workflows) visit(workflow);
	return ordered;
}

/** parent workflow id → ids of the workflows it depends on (calls as sub-workflows). */
function buildDependencyMap(requirements: PackageWorkflowRequirement[]): Map<string, string[]> {
	const dependenciesByWorkflowId = new Map<string, string[]>();
	for (const requirement of requirements) {
		for (const parentId of requirement.usedByWorkflows) {
			const dependencies = dependenciesByWorkflowId.get(parentId) ?? [];
			dependencies.push(requirement.id);
			dependenciesByWorkflowId.set(parentId, dependencies);
		}
	}
	return dependenciesByWorkflowId;
}
