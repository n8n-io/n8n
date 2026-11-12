import { GraphValidationError } from './graph-validation.error';
import type { GraphAttachment, WorkflowGraph } from './workflow-graph';
import { createNodeLabeler } from './workflow-graph-queries';

/** The attachments that leave `nodeId`, in graph order. */
function attachmentsFrom(graph: WorkflowGraph, nodeId: string): GraphAttachment[] {
	return (graph.attachments ?? []).filter((attachment) => attachment.from === nodeId);
}

/**
 * Asserts the attachment rules of
 * ADR-20261109-attach-sub-nodes-to-the-graph-outside-its-edges, decision 4:
 * both ends exist, only `attached` nodes attach, an `attached` node has no
 * edge, attachments have no cycles, and every `attached` node leads through
 * attachments to a node in `reachableFromTrigger`.
 */
export function validateAttachments(graph: WorkflowGraph, reachableFromTrigger: Set<string>): void {
	const name = createNodeLabeler(graph);
	const nodesById = new Map(graph.nodes.map((node) => [node.id, node]));
	const attachments = graph.attachments ?? [];

	for (const { from, to } of attachments) {
		for (const end of [from, to]) {
			if (!nodesById.has(end)) {
				throw new GraphValidationError(
					`Attachment ${name(from)} -> ${name(to)} names node ${name(end)}, which is not in the graph`,
				);
			}
		}
		if (nodesById.get(from)?.type !== 'attached') {
			throw new GraphValidationError(
				`Attachment ${name(from)} -> ${name(to)} starts at ${name(from)}, which is not an attached node`,
			);
		}
	}

	const attachedIds = new Set(
		graph.nodes.filter((node) => node.type === 'attached').map((node) => node.id),
	);
	for (const edge of graph.edges) {
		const attachedEnd = [edge.from, edge.to].find((end) => attachedIds.has(end));
		if (attachedEnd !== undefined) {
			throw new GraphValidationError(
				`Edge ${name(edge.from)} -> ${name(edge.to)} touches attached node ${name(attachedEnd)}; attached nodes have no edges`,
			);
		}
	}

	rejectAttachmentCycles(graph, name);

	for (const nodeId of attachedIds) {
		if (!leadsToReachableNode(graph, nodeId, reachableFromTrigger)) {
			throw new GraphValidationError(
				`Attached node ${name(nodeId)} does not lead through attachments to a node the trigger reaches`,
			);
		}
	}
}

function rejectAttachmentCycles(graph: WorkflowGraph, name: (nodeId: string) => string): void {
	const done = new Set<string>();
	const onPath = new Set<string>();

	const visit = (nodeId: string): void => {
		if (done.has(nodeId)) return;
		if (onPath.has(nodeId)) {
			throw new GraphValidationError(`Attachments form a cycle through ${name(nodeId)}`);
		}
		onPath.add(nodeId);
		for (const attachment of attachmentsFrom(graph, nodeId)) visit(attachment.to);
		onPath.delete(nodeId);
		done.add(nodeId);
	};

	for (const attachment of graph.attachments ?? []) visit(attachment.from);
}

/** Call only on acyclic attachments. */
function leadsToReachableNode(
	graph: WorkflowGraph,
	nodeId: string,
	reachableFromTrigger: Set<string>,
): boolean {
	if (reachableFromTrigger.has(nodeId)) return true;
	return attachmentsFrom(graph, nodeId).some((attachment) =>
		leadsToReachableNode(graph, attachment.to, reachableFromTrigger),
	);
}

/**
 * Checks an action target per
 * ADR-20261109-attach-sub-nodes-to-the-graph-outside-its-edges, decision 5.
 * The target must be an `attached` node with a path of attachments to the
 * declaring node, and the node at the end of each hop must list the hop's kind
 * in its `actionTargetKinds`.
 *
 * Returns the kind and the `to` node of the first hop of a valid path, or
 * `null` when no path is valid.
 *
 * SPIKE: when more than one path is valid, the first in attachment order wins.
 * v1 picks the parent from the action's `parentNodeName` instead.
 */
export function findActionTargetPath(
	graph: WorkflowGraph,
	declaringNodeId: string,
	targetNodeId: string,
): { kind: string; attachedToNodeId: string } | null {
	const target = graph.nodes.find((node) => node.id === targetNodeId);
	if (target?.type !== 'attached') return null;

	const allowedKindsById = new Map(
		graph.nodes.map((node) => [node.id, new Set(node.actionTargetKinds ?? [])]),
	);
	const visited = new Set<string>();

	const leadsToDeclaringNode = (nodeId: string): boolean => {
		if (nodeId === declaringNodeId) return true;
		if (visited.has(nodeId)) return false;
		visited.add(nodeId);
		return attachmentsFrom(graph, nodeId).some(
			(hop) => allowedKindsById.get(hop.to)?.has(hop.kind) && leadsToDeclaringNode(hop.to),
		);
	};

	const firstHop = attachmentsFrom(graph, targetNodeId).find(
		(hop) => allowedKindsById.get(hop.to)?.has(hop.kind) && leadsToDeclaringNode(hop.to),
	);
	if (!firstHop) return null;
	return { kind: firstHop.kind, attachedToNodeId: firstHop.to };
}
