import type { IConnections } from 'n8n-workflow';
import { mapConnectionsByDestination, getChildNodes, getParentNodes } from 'n8n-workflow';
import type { InstanceAiAttachment, InstanceAiNodesAttachment } from '@n8n/api-types';

export interface NodeContextNode {
	id: string;
	name: string;
	type: string;
}

export interface NodeContextWorkflow {
	nodes: NodeContextNode[];
	/** `workflow.connections`, keyed by source node NAME. */
	connections: IConnections;
	groupsById: Map<string, { id: string; name: string }>;
	nodeIdToGroupId: Map<string, string>;
}

export interface NodeSet {
	nodeNames: string[];
}

export type NodesAttachmentSet = InstanceAiNodesAttachment['sets'][number];

export const setSignature = (set: NodesAttachmentSet) =>
	set.nodes
		.map((n) => n.id)
		.sort()
		.join('\n');

/** Append incoming sets to existing ones, skipping duplicates and capping the total to the schema limit. */
export function mergeNodeSets(
	existing: InstanceAiNodesAttachment['sets'],
	incoming: InstanceAiNodesAttachment['sets'],
): InstanceAiNodesAttachment['sets'] {
	const seen = new Set(existing.map(setSignature));
	const merged = [...existing, ...incoming.filter((s) => !seen.has(setSignature(s)))];
	return merged.slice(0, MAX_SETS_PER_ATTACHMENT);
}

// Schema caps (instanceAiNodeSetSchema / instanceAiNodesAttachmentSchema).
const MAX_NODES_PER_SET = 50;
const MAX_SETS_PER_ATTACHMENT = 50;

/**
 * One "add to chat" action = one set: everything the user picked, regardless of
 * connectivity. Ordered input→output by walking selected `main` connections from
 * each parentless member, so chains stay contiguous and disconnected members
 * (e.g. a sub-node picked without its parent) follow after.
 */
export function orderSelectionIntoSet(
	selectedNodeNames: string[],
	connections: IConnections,
): NodeSet {
	const selected = new Set(selectedNodeNames);
	const byDestination = mapConnectionsByDestination(connections);

	const selectedChildren = (name: string) =>
		getChildNodes(connections, name, 'main', 1).filter((n) => selected.has(n));
	const selectedParents = (name: string) =>
		getParentNodes(byDestination, name, 'main', 1).filter((n) => selected.has(n));

	const order: string[] = [];
	const visited = new Set<string>();
	const visit = (start: string) => {
		const queue = [start];
		visited.add(start);
		while (queue.length) {
			const cur = queue.shift() as string;
			order.push(cur);
			for (const child of selectedChildren(cur)) {
				if (!visited.has(child)) {
					visited.add(child);
					queue.push(child);
				}
			}
		}
	};

	for (const n of selectedNodeNames) {
		if (!visited.has(n) && selectedParents(n).length === 0) visit(n);
	}
	// Members without a parentless entry point (cycles) appended deterministically.
	for (const n of [...selectedNodeNames].sort()) if (!visited.has(n)) visit(n);

	return { nodeNames: order };
}

/** Find the set's immediate upstream/downstream nodes that sit just outside it, for send-time context. */
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

/** Return the canvas group a multi-node set belongs to, when all its members share exactly one. */
export function resolveSetCanvasGroup(
	set: NodeSet,
	workflow: NodeContextWorkflow,
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

/**
 * Turn a raw node selection into one attachment set: resolve ids to names, order
 * them, cap at the schema limit, and attach neighbor/group context. Returns null
 * when nothing resolves; `truncated` flags that the cap was hit.
 */
export function buildNodesAttachment(
	workflowId: string,
	selectedNodeIds: string[],
	workflow: NodeContextWorkflow,
): { attachment: InstanceAiNodesAttachment; truncated: boolean } | null {
	if (selectedNodeIds.length === 0) return null;

	const idToName = new Map(workflow.nodes.map((n) => [n.id, n.name]));
	const nameToId = new Map(workflow.nodes.map((n) => [n.name, n.id]));
	const selectedNames = selectedNodeIds
		.map((id) => idToName.get(id))
		.filter((n): n is string => Boolean(n));
	if (selectedNames.length === 0) return null;

	let truncated = false;
	let names = orderSelectionIntoSet(selectedNames, workflow.connections).nodeNames;
	if (names.length > MAX_NODES_PER_SET) {
		names = names.slice(0, MAX_NODES_PER_SET);
		truncated = true;
	}

	const ref = (name: string) => ({ id: nameToId.get(name) ?? name, name });
	const { inputName, outputName } = resolveSetNeighbors({ nodeNames: names }, workflow.connections);
	const group = resolveSetCanvasGroup({ nodeNames: names }, workflow);
	const serialized: InstanceAiNodesAttachment['sets'] = [
		{
			nodes: names.map(ref),
			...(inputName && nameToId.has(inputName) ? { inputNode: ref(inputName) } : {}),
			...(outputName && nameToId.has(outputName) ? { outputNode: ref(outputName) } : {}),
			...group,
		},
	];

	return { attachment: { type: 'nodes', workflowId, sets: serialized }, truncated };
}

/** Total nodes attached across every `nodes` attachment in a sent message. */
export function countAttachedNodes(attachments?: InstanceAiAttachment[]): number {
	return (attachments ?? [])
		.filter((a): a is InstanceAiNodesAttachment => a.type === 'nodes')
		.reduce((sum, a) => sum + a.sets.reduce((s, set) => s + set.nodes.length, 0), 0);
}
