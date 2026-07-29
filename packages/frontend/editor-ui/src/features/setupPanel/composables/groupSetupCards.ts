import { NodeConnectionTypes } from 'n8n-workflow';

import type { INodeUi } from '@/Interface';
import type {
	SetupCardItem,
	NodeSetupState,
	NodeGroupItem,
} from '@/features/setupPanel/setupPanel.types';

interface ConnectionsByDestination {
	[nodeName: string]: {
		[connectionType: string]: Array<Array<{ node: string; type: string; index: number }> | null>;
	};
}

/**
 * Builds a map of parent node name → direct sub-node names by inspecting
 * non-Main connections (AI connections like ai_languageModel, ai_tool, etc.).
 */
function getDirectSubnodes(
	nodes: INodeUi[],
	connectionsByDestination: ConnectionsByDestination,
): Map<string, Set<string>> {
	const directSubnodes = new Map<string, Set<string>>();

	for (const node of nodes) {
		const destConns = connectionsByDestination[node.name];
		if (!destConns) continue;

		const subs = new Set<string>();
		for (const connType of Object.keys(destConns)) {
			if (connType === NodeConnectionTypes.Main) continue;
			for (const inputSlot of destConns[connType as keyof typeof destConns] ?? []) {
				for (const conn of inputSlot ?? []) {
					subs.add(conn.node);
				}
			}
		}
		if (subs.size > 0) {
			directSubnodes.set(node.name, subs);
		}
	}

	return directSubnodes;
}

/**
 * Recursively collects all transitive sub-nodes reachable from a parent,
 * using the direct sub-node map.
 */
function collectTransitiveSubnodes(
	parentName: string,
	directSubnodes: Map<string, Set<string>>,
	visited: Set<string>,
): Set<string> {
	const result = new Set<string>();
	const direct = directSubnodes.get(parentName);
	if (!direct) return result;

	for (const subName of direct) {
		if (visited.has(subName)) continue;
		visited.add(subName);
		result.add(subName);
		const nested = collectTransitiveSubnodes(subName, directSubnodes, visited);
		for (const n of nested) result.add(n);
	}
	return result;
}

/**
 * Groups flat setup cards into node groups based on non-Main (parent/child) connections.
 *
 * Algorithm:
 * 1. Build a direct sub-node map from non-Main connections
 * 2. Find root parents (nodes with sub-nodes that aren't sub-nodes themselves)
 * 3. Recursively collect transitive sub-nodes for each root parent
 * 4. Replace individual cards with grouped entries in the final list
 *
 * Returns the original flat list unchanged if no groupable connections exist.
 */
export function groupSetupCards(
	flatCards: SetupCardItem[],
	nodes: INodeUi[],
	connectionsByDestination: ConnectionsByDestination,
	executionOrder: string[],
): SetupCardItem[] {
	// Step 1: Build direct sub-node map
	const directSubnodes = getDirectSubnodes(nodes, connectionsByDestination);
	if (directSubnodes.size === 0) return flatCards;

	// Step 2: Find all sub-node names (union of all direct sub-node sets)
	const allSubnodeNames = new Set<string>();
	for (const subs of directSubnodes.values()) {
		for (const name of subs) allSubnodeNames.add(name);
	}

	// Step 3: Root parents = nodes with sub-nodes that are NOT themselves sub-nodes
	const rootParentNames: string[] = [];
	for (const parentName of directSubnodes.keys()) {
		if (!allSubnodeNames.has(parentName)) {
			rootParentNames.push(parentName);
		}
	}

	if (rootParentNames.length === 0) return flatCards;

	// Step 4: For each root parent, recursively collect ALL transitive sub-nodes
	const claimedNodeNames = new Set<string>();
	const nodeGroups = new Map<string, NodeGroupItem>();

	const sortedRootParents = [...rootParentNames].sort(
		(a, b) => executionOrder.indexOf(a) - executionOrder.indexOf(b),
	);

	for (const rootParentName of sortedRootParents) {
		const rootParentNode = nodes.find((n) => n.name === rootParentName);
		if (!rootParentNode) continue;

		const visited = new Set<string>();
		const subnodeNames = collectTransitiveSubnodes(rootParentName, directSubnodes, visited);

		// Remove already-claimed nodes
		for (const name of [...subnodeNames]) {
			if (claimedNodeNames.has(name)) subnodeNames.delete(name);
		}

		// Collect subnode cards from the flat list
		const subnodeCards: NodeSetupState[] = [];
		let parentState: NodeSetupState | undefined;

		for (const card of flatCards) {
			if (!card.state) continue;
			const nodeName = card.state.node.name;
			if (subnodeNames.has(nodeName) && !claimedNodeNames.has(nodeName)) {
				subnodeCards.push(card.state);
			}
			if (nodeName === rootParentName && !claimedNodeNames.has(nodeName)) {
				parentState = card.state;
			}
		}

		// Only create group if at least one subnode has a card
		if (subnodeCards.length === 0) continue;

		// Claim all grouped node names
		for (const s of subnodeCards) claimedNodeNames.add(s.node.name);
		if (parentState) claimedNodeNames.add(rootParentNode.name);

		nodeGroups.set(rootParentName, {
			parentNode: rootParentNode,
			parentState,
			subnodeCards,
		});
	}

	if (nodeGroups.size === 0) return flatCards;

	// Step 5: Build final list — replace claimed cards with node group entries
	const result: SetupCardItem[] = [];
	const insertedNodeGroups = new Set<string>();

	for (const card of flatCards) {
		const nodeName = card.state!.node.name;

		if (claimedNodeNames.has(nodeName)) {
			// Check if this node owns a group
			const group = nodeGroups.get(nodeName);
			if (group && !insertedNodeGroups.has(nodeName)) {
				result.push({ nodeGroup: group });
				insertedNodeGroups.add(nodeName);
			}
			// For subnode cards that appear before their parent in execution order,
			// insert the group at the first subnode position
			if (!group) {
				for (const [parentName, nodeGroup] of nodeGroups) {
					if (
						!insertedNodeGroups.has(parentName) &&
						(nodeGroup.subnodeCards.some((s) => s.node.name === nodeName) ||
							nodeGroup.parentState?.node.name === nodeName)
					) {
						result.push({ nodeGroup });
						insertedNodeGroups.add(parentName);
						break;
					}
				}
			}
			continue;
		}

		result.push(card);
	}

	return result;
}
