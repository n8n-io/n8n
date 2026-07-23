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
	// Ids already seen: either placed in `ordered`, or still on the recursion stack.
	// Re-entering one on the stack means a cycle — skipping it breaks the loop.
	const seen = new Set<string>();

	const visit = (workflow: T): void => {
		const id = workflow.sourceWorkflowId;
		if (seen.has(id)) return;
		seen.add(id);

		for (const dependencyId of dependenciesByWorkflowId.get(id) ?? []) {
			const dependency = workflowsById.get(dependencyId);
			if (dependency) visit(dependency);
		}
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
