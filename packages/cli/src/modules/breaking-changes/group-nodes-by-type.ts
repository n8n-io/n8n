import type { INode } from 'n8n-workflow';

/** Group a workflow's nodes by their `type`, as the workflow rules expect. */
export function groupNodesByType(nodes: INode[]): Map<string, INode[]> {
	const grouped = new Map<string, INode[]>();
	for (const node of nodes) {
		const existing = grouped.get(node.type);
		if (existing) existing.push(node);
		else grouped.set(node.type, [node]);
	}
	return grouped;
}
