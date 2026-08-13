import type { IConnections } from 'n8n-workflow';
import { mapConnectionsByDestination, getChildNodes, getParentNodes } from 'n8n-workflow';
import type { InstanceAiNodesAttachment } from '@n8n/api-types';

/** Minimal node info the builder needs — caller maps canvas nodes to this. */
export interface BuilderNode {
	id: string;
	name: string;
	type: string;
}

/** Plain workflow data the builder reads — no store, no reactivity. */
export interface BuilderWorkflow {
	/** All nodes in the workflow, so ids can be translated to names and back. */
	nodes: BuilderNode[];
	/** `workflow.connections`, keyed by source node NAME. */
	connections: IConnections;
	/** `id -> { id, name }` for canvas groups; empty if none. */
	groupsById: Map<string, { id: string; name: string; nodeIds: string[] }>;
	/** `nodeId -> groupId` reverse index. */
	nodeIdToGroupId: Map<string, string>;
}

/** One partitioned set, in NAME-space, before schema serialization. */
export interface NodeSet {
	/** Node names, ordered input→output. */
	nodeNames: string[];
}

export type NodesAttachmentSet = InstanceAiNodesAttachment['sets'][number];

export function partitionSelectionIntoSets(
	selectedNodeNames: string[],
	connections: IConnections,
): NodeSet[] {
	const selected = new Set(selectedNodeNames);
	const byDestination = mapConnectionsByDestination(connections);
	const seen = new Set<string>();
	const sets: NodeSet[] = [];

	// Neighbors within the selection only (both endpoints selected).
	const selectedChildren = (name: string) =>
		getChildNodes(connections, name, 'main', 1).filter((n) => selected.has(n));
	const selectedParents = (name: string) =>
		getParentNodes(byDestination, name, 'main', 1).filter((n) => selected.has(n));

	for (const start of selectedNodeNames) {
		if (seen.has(start)) continue;

		// Collect the connected component (undirected) among selected nodes.
		const component = new Set<string>();
		const stack = [start];
		while (stack.length) {
			const cur = stack.pop() as string;
			if (component.has(cur)) continue;
			component.add(cur);
			for (const n of [...selectedChildren(cur), ...selectedParents(cur)]) {
				if (!component.has(n)) stack.push(n);
			}
		}
		component.forEach((n) => seen.add(n));

		// Order input→output: BFS from members with no selected parent.
		const roots = [...component].filter((n) => selectedParents(n).length === 0);
		const order: string[] = [];
		const queued = new Set<string>();
		const queue = roots.length ? [...roots] : [[...component][0]];
		queue.forEach((n) => queued.add(n));
		while (queue.length) {
			const cur = queue.shift() as string;
			order.push(cur);
			for (const child of selectedChildren(cur)) {
				if (component.has(child) && !queued.has(child)) {
					queued.add(child);
					queue.push(child);
				}
			}
		}
		// Any members unreachable via children (rare non-linear shapes) appended deterministically.
		for (const n of [...component].sort()) if (!order.includes(n)) order.push(n);

		sets.push({ nodeNames: order });
	}

	return sets;
}

export function resolveSetNeighbors(
	set: NodeSet,
	connections: IConnections,
): { inputName?: string; outputName?: string } {
	const inSet = new Set(set.nodeNames);
	const byDestination = mapConnectionsByDestination(connections);
	const head = set.nodeNames[0];
	const tail = set.nodeNames[set.nodeNames.length - 1];

	const inputName = getParentNodes(byDestination, head, 'main', 1).find((n) => !inSet.has(n));
	const outputName = getChildNodes(connections, tail, 'main', 1).find((n) => !inSet.has(n));

	return { inputName, outputName };
}

export function resolveSetCanvasGroup(
	set: NodeSet,
	workflow: BuilderWorkflow,
): { canvasGroupId?: string; canvasGroupName?: string } {
	const nameToId = new Map(workflow.nodes.map((n) => [n.name, n.id]));
	const groupIds = new Set(
		set.nodeNames.map((name) => workflow.nodeIdToGroupId.get(nameToId.get(name) ?? '')),
	);
	if (groupIds.size !== 1) return {};
	const [only] = [...groupIds];
	if (!only) return {}; // the single value is `undefined` → some/all ungrouped
	const group = workflow.groupsById.get(only);
	return group ? { canvasGroupId: group.id, canvasGroupName: group.name } : {};
}
