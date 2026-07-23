import type { PackageWorkflowRequirement } from '../../spec/requirements.schema';

/**
 * Orders workflows so each sub-workflow is placed before the workflows that call it,
 * using the manifest's `requirements.workflows` graph. Ids not present in `workflows`
 * are ignored, and cycles (including self-references) are tolerated.
 */
export function orderBySubWorkflowDependencies<T extends { sourceWorkflowId: string }>(
	workflows: T[],
	requirements: PackageWorkflowRequirement[] | undefined,
): T[] {
	if (!requirements?.length) return workflows;

	const dependenciesByWorkflowId = buildDependencyMap(requirements);
	const workflowsById = new Map(workflows.map((workflow) => [workflow.sourceWorkflowId, workflow]));

	const ordered: T[] = [];
	// Re-entering an id still on the recursion stack means a cycle; skip it to break the loop.
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
