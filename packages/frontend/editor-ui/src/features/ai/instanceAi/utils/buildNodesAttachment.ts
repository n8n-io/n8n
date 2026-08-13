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

/** Identity of a set = its node ids (order-independent), so re-adding the same selection dedups. */
const setSignature = (set: NodesAttachmentSet) =>
	set.nodes
		.map((n) => n.id)
		.sort()
		.join('\n');

/** Append incoming sets to existing ones, dropping any whose node membership is already present. */
export function mergeNodeSets(
	existing: InstanceAiNodesAttachment['sets'],
	incoming: InstanceAiNodesAttachment['sets'],
): InstanceAiNodesAttachment['sets'] {
	const seen = new Set(existing.map(setSignature));
	return [...existing, ...incoming.filter((s) => !seen.has(setSignature(s)))];
}

// Schema caps (instanceAiNodeSetSchema / instanceAiNodesAttachmentSchema, #36039).
// The safeParse test in this file is the real drift-guard — no need to poke zod internals.
const MAX_SETS = 50;
const MAX_NODES_PER_SET = 50;

export function partitionSelectionIntoSets(
	selectedNodeNames: string[],
	connections: IConnections,
): NodeSet[] {
	const selected = new Set(selectedNodeNames);
	const byDestination = mapConnectionsByDestination(connections);
	const seen = new Set<string>();
	const sets: NodeSet[] = [];

	// Neighbors within the selection only (both endpoints selected). `main`-only
	// drives the input→output ordering below; `ALL` also folds sub-nodes (chat
	// models, memory, tools) into their parent's set instead of stranding them.
	const selectedChildren = (name: string) =>
		getChildNodes(connections, name, 'main', 1).filter((n) => selected.has(n));
	const selectedParents = (name: string) =>
		getParentNodes(byDestination, name, 'main', 1).filter((n) => selected.has(n));
	const selectedNeighborsAllTypes = (name: string) =>
		[
			...getChildNodes(connections, name, 'ALL', 1),
			...getParentNodes(byDestination, name, 'ALL', 1),
		].filter((n) => selected.has(n));

	for (const start of selectedNodeNames) {
		if (seen.has(start)) continue;

		// Collect the connected component (undirected, any connection type) among
		// selected nodes, so a sub-node lands in the same set as its parent.
		const component = new Set<string>();
		const stack = [start];
		while (stack.length) {
			const cur = stack.pop() as string;
			if (component.has(cur)) continue;
			component.add(cur);
			for (const n of selectedNeighborsAllTypes(cur)) {
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
	// A lone node stays its own named chip even when grouped — labeling one member
	// with the group name reads as a duplicate when several members are added.
	if (set.nodeNames.length < 2) return {};
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

export function buildNodesAttachment(
	workflowId: string,
	selectedNodeIds: string[],
	workflow: BuilderWorkflow,
): { attachment: InstanceAiNodesAttachment; truncated: boolean } | null {
	if (selectedNodeIds.length === 0) return null;

	const idToName = new Map(workflow.nodes.map((n) => [n.id, n.name]));
	const nameToId = new Map(workflow.nodes.map((n) => [n.name, n.id]));
	const selectedNames = selectedNodeIds
		.map((id) => idToName.get(id))
		.filter((n): n is string => Boolean(n));
	if (selectedNames.length === 0) return null;

	let truncated = false;
	let sets = partitionSelectionIntoSets(selectedNames, workflow.connections);

	if (sets.length > MAX_SETS) {
		sets = sets.slice(0, MAX_SETS);
		truncated = true;
	}

	const ref = (name: string) => ({ id: nameToId.get(name) ?? name, name });

	const serialized: InstanceAiNodesAttachment['sets'] = sets.map((set) => {
		let names = set.nodeNames;
		if (names.length > MAX_NODES_PER_SET) {
			names = names.slice(0, MAX_NODES_PER_SET);
			truncated = true;
		}
		const { inputName, outputName } = resolveSetNeighbors(
			{ nodeNames: names },
			workflow.connections,
		);
		const group = resolveSetCanvasGroup({ nodeNames: names }, workflow);
		return {
			nodes: names.map(ref),
			...(inputName && nameToId.has(inputName) ? { inputNode: ref(inputName) } : {}),
			...(outputName && nameToId.has(outputName) ? { outputNode: ref(outputName) } : {}),
			...group,
		};
	});

	return { attachment: { type: 'nodes', workflowId, sets: serialized }, truncated };
}
