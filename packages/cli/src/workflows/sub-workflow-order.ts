import { EXECUTE_WORKFLOW_NODE_TYPE, type INode } from 'n8n-workflow';

/**
 * Sorts workflows so that sub-workflows come before the workflows that call them.
 * Uses Kahn's topological sort algorithm. Workflows in a call cycle, and the workflows
 * that call them, come last in their original order and are also returned as `cyclic`.
 */
export function sortSubWorkflowsFirst<T>(
	items: T[],
	getWorkflow: (item: T) => { id: string; nodes: INode[] },
): { ordered: T[]; cyclic: T[] } {
	const workflows = items.map(getWorkflow);
	const indexById = new Map(workflows.map(({ id }, index) => [id, index]));
	// callee index → indexes of its callers in the batch
	const dependents = items.map(() => new Set<number>());
	// caller index → number of its callees in the batch that are not yet sorted
	const unresolved = items.map(() => 0);

	workflows.forEach(({ id, nodes }, caller) => {
		for (const node of nodes) {
			const calleeId = node.disabled ? undefined : getCalledWorkflowId(node);
			if (!calleeId || calleeId === id) continue;
			const callee = indexById.get(calleeId);
			if (callee === undefined || dependents[callee].has(caller)) continue;
			dependents[callee].add(caller);
			unresolved[caller] += 1;
		}
	});
	if (unresolved.every((count) => count === 0)) return { ordered: items, cyclic: [] };

	const queue = items.flatMap((_, index) => (unresolved[index] === 0 ? [index] : []));
	for (let cursor = 0; cursor < queue.length; cursor++) {
		for (const caller of dependents[queue[cursor]]) {
			unresolved[caller] -= 1;
			if (unresolved[caller] === 0) queue.push(caller);
		}
	}
	const cyclic = items.filter((_, index) => unresolved[index] > 0);
	return { ordered: [...queue.map((index) => items[index]), ...cyclic], cyclic };
}

// Publication validation checks only Execute Sub-workflow references.
function getCalledWorkflowId(node: INode): string | undefined {
	if (node.type !== EXECUTE_WORKFLOW_NODE_TYPE) return undefined;
	const source = node.parameters?.source;
	if (source === 'parameter' || source === 'localFile' || source === 'url') return undefined;
	const workflowId = node.parameters?.workflowId;
	const value =
		typeof workflowId === 'object' && workflowId !== null && 'value' in workflowId
			? workflowId.value
			: workflowId;
	return typeof value === 'string' && !value.startsWith('=') ? value : undefined;
}
