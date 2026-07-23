import type { PackageWorkflowRequirement } from '../../spec/requirements.schema';

/**
 * Orders workflows so each sub-workflow is placed before the workflows that call it,
 * using the manifest's `requirements.workflows` graph (Kahn's topological sort). Ids
 * not present in `workflows` are ignored; cycles (including self-references) are
 * tolerated by appending their members in the original relative order.
 */
export function orderBySubWorkflowDependencies<T extends { sourceWorkflowId: string }>(
	workflows: T[],
	requirements: PackageWorkflowRequirement[] | undefined,
): T[] {
	if (!requirements?.length) return workflows;

	const workflowsById = new Map(workflows.map((workflow) => [workflow.sourceWorkflowId, workflow]));

	// sub-workflow id → workflows that call it; caller id → count of its in-batch
	// sub-workflow dependencies not yet placed.
	const callers = new Map<string, string[]>();
	const pendingDependencies = new Map<string, number>(
		workflows.map((workflow) => [workflow.sourceWorkflowId, 0]),
	);

	for (const requirement of requirements) {
		if (!workflowsById.has(requirement.id)) continue;
		for (const callerId of requirement.usedByWorkflows) {
			// Ignore callers outside the batch and self-references (a workflow calling itself).
			if (!workflowsById.has(callerId) || callerId === requirement.id) continue;
			const existing = callers.get(requirement.id);
			if (existing) existing.push(callerId);
			else callers.set(requirement.id, [callerId]);
			pendingDependencies.set(callerId, pendingDependencies.get(callerId)! + 1);
		}
	}

	// Seed with workflows that depend on nothing in the batch, preserving input order.
	const queue = workflows.filter(
		(workflow) => pendingDependencies.get(workflow.sourceWorkflowId) === 0,
	);
	const ordered: T[] = [];

	for (let cursor = 0; cursor < queue.length; cursor++) {
		const workflow = queue[cursor];
		ordered.push(workflow);
		for (const callerId of callers.get(workflow.sourceWorkflowId) ?? []) {
			const pending = pendingDependencies.get(callerId)! - 1;
			pendingDependencies.set(callerId, pending);
			if (pending === 0) queue.push(workflowsById.get(callerId)!);
		}
	}

	// Whatever never reached the queue is part of a cycle; append it in original order.
	if (ordered.length < workflows.length) {
		const placed = new Set(ordered.map((workflow) => workflow.sourceWorkflowId));
		for (const workflow of workflows) {
			if (!placed.has(workflow.sourceWorkflowId)) ordered.push(workflow);
		}
	}

	return ordered;
}
