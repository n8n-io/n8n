/**
 * Node Diff Utility
 *
 * Calculates the difference between two workflow states in terms of nodes:
 * - nodes_added: nodes present in after but not in before
 * - nodes_removed: nodes present in before but not in after
 * - nodes_modified: nodes present in both but with different JSON
 */

interface NodeLike {
	name?: string;
}

interface WorkflowLike {
	nodes: NodeLike[];
}

export interface NodeDiffResult {
	nodes_added: number;
	nodes_removed: number;
	nodes_modified: number;
}

/**
 * Calculate the difference between two workflow states in terms of node changes.
 *
 * @param before - The workflow state before the change (or null if new)
 * @param after - The workflow state after the change (or null if deleted)
 * @returns Object with counts of added, removed, and modified nodes
 */
export function calculateNodeChanges(
	before: WorkflowLike | null | undefined,
	after: WorkflowLike | null | undefined,
): NodeDiffResult {
	const beforeNodes = before?.nodes ?? [];
	const afterNodes = after?.nodes ?? [];

	// Filter out nodes without names (shouldn't happen but handle gracefully)
	const beforeNodesWithNames = beforeNodes.filter((n): n is { name: string } => !!n.name);
	const afterNodesWithNames = afterNodes.filter((n): n is { name: string } => !!n.name);

	const beforeNames = new Set(beforeNodesWithNames.map((n) => n.name));
	const afterNames = new Set(afterNodesWithNames.map((n) => n.name));

	const nodes_added = [...afterNames].filter((n) => !beforeNames.has(n)).length;
	const nodes_removed = [...beforeNames].filter((n) => !afterNames.has(n)).length;

	// For modified: nodes present in both but with different JSON
	const beforeMap = new Map(beforeNodesWithNames.map((n) => [n.name, JSON.stringify(n)]));
	const nodes_modified = [...afterNames].filter((name) => {
		if (!beforeNames.has(name)) return false;
		const afterNode = afterNodesWithNames.find((n) => n.name === name);
		return beforeMap.get(name) !== JSON.stringify(afterNode);
	}).length;

	return { nodes_added, nodes_removed, nodes_modified };
}
