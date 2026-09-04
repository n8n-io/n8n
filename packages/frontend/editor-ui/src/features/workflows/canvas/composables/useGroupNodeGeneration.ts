import { NodeConnectionTypes, getInteriorEntryNodes, getInteriorExitNodes } from 'n8n-workflow';
import type { IConnection } from 'n8n-workflow';

import type { XYPosition } from '@/Interface';
import { SET_NODE_TYPE } from '@/app/constants/nodeTypes';
import { injectWorkflowDocumentStore } from '@/app/stores/workflowDocument.store';

import { useGroupNodeOperations } from './useGroupNodeOperations';

/**
 * Fills an empty group with nodes.
 *
 * This is the MOCK generator that the "Build" affordance calls. It drops a small
 * fixed chain into the group's interior so the empty to filled to empty round
 * trip is demoable offline. It is not an AI integration.
 *
 * The seam for a real generator is `GroupInteriorGenerator`: give
 * `generateGroupInterior` a different generator and nothing else changes.
 * Deleting every interior node leaves the group empty again, because emptiness
 * is "no node has this `parentId`" and needs no clean-up step.
 */

/** Nodes and their chain, for the group's interior. */
export type GeneratedInterior = {
	nodes: Array<{ type: string; name: string; position: XYPosition }>;
	/** Chain edges, as index pairs into `nodes`. */
	edges: Array<[number, number]>;
};

export type GroupInteriorGenerator = (input: {
	groupId: string;
	title: string;
	objective: string;
	origin: XYPosition;
}) => GeneratedInterior;

/** Horizontal gap between two generated nodes. */
const NODE_GAP = 240;

/**
 * The mock generator: an Extract, Transform, Load chain.
 *
 * A real generator would read the objective and return its own nodes. This one
 * ignores it, so the demo needs no model and no network.
 */
export const mockInteriorGenerator: GroupInteriorGenerator = ({ origin }) => {
	const labels = ['Extract', 'Transform', 'Load'];

	return {
		nodes: labels.map((label, index) => ({
			type: SET_NODE_TYPE,
			name: label,
			position: [origin[0] + index * NODE_GAP, origin[1]] as XYPosition,
		})),
		edges: labels.slice(0, -1).map((_label, index): [number, number] => [index, index + 1]),
	};
};

export function useGroupNodeGeneration() {
	const workflowDocumentStore = injectWorkflowDocumentStore();
	const { getGroupNode, getGroupObjective, isGroupEmpty } = useGroupNodeOperations();

	/**
	 * The interior nodes a boundary edge reaches, for the canvas to fan the edge.
	 * Reads the group semantics from `n8n-workflow`, so the canvas and the engine
	 * agree on what an entry node is.
	 */
	function interiorBoundary(groupId: string): { entries: string[]; exits: string[] } {
		const nodes = workflowDocumentStore.value.allNodes;
		const connections = workflowDocumentStore.value.connectionsBySourceNode;

		return {
			entries: getInteriorEntryNodes(nodes, connections, groupId).map((node) => node.name),
			exits: getInteriorExitNodes(nodes, connections, groupId).map((node) => node.name),
		};
	}

	/** Boundary edges of the group, so a generator can keep them attached. */
	function boundaryConnections(groupName: string): {
		incoming: IConnection[];
		outgoing: IConnection[];
	} {
		const bySource = workflowDocumentStore.value.connectionsBySourceNode;
		const main = NodeConnectionTypes.Main;
		const incoming: IConnection[] = [];

		for (const [from, outputs] of Object.entries(bySource)) {
			for (const targets of outputs[main] ?? []) {
				for (const target of targets ?? []) {
					if (target.node === groupName) {
						incoming.push({ node: from, type: main, index: target.index });
					}
				}
			}
		}

		const outgoing = (bySource[groupName]?.[main]?.flat() ?? []).filter(
			(connection): connection is IConnection => connection !== null,
		);

		return { incoming, outgoing };
	}

	/**
	 * The plan for filling a group, for the caller to apply through the canvas
	 * operations. Kept separate from the mutation so the generator stays a pure
	 * function and is easy to test.
	 */
	function planInterior(
		groupId: string,
		generate: GroupInteriorGenerator = mockInteriorGenerator,
	): GeneratedInterior | undefined {
		const groupNode = getGroupNode(groupId);
		if (groupNode === undefined || !isGroupEmpty(groupId)) return undefined;

		return generate({
			groupId,
			title: groupNode.name,
			objective: getGroupObjective(groupId),
			// The interior starts inside the card, below its header.
			origin: [groupNode.position[0] + 32, groupNode.position[1] + 96],
		});
	}

	return { planInterior, interiorBoundary, boundaryConnections };
}
