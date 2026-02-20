import type { INodeTypeDescription } from 'n8n-workflow';
import { getChildNodes } from 'n8n-workflow';

import { createNodeTypeMaps, getNodeTypeForNode } from '@/validation/utils/node-type-map';

import type { BinaryCheck, BinaryCheckContext, SimpleWorkflow } from '../types';

const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';

function findTriggerNames(workflow: SimpleWorkflow, nodeTypes: INodeTypeDescription[]): string[] {
	const { nodeTypeMap, nodeTypesByName } = createNodeTypeMaps(nodeTypes);
	const triggers: string[] = [];
	for (const node of workflow.nodes) {
		const nodeType = getNodeTypeForNode(node, nodeTypeMap, nodeTypesByName);
		if (nodeType?.group.includes('trigger')) {
			triggers.push(node.name);
		}
	}
	return triggers;
}

/**
 * Expand the reachable set by finding sub-nodes that connect TO already-reachable
 * nodes via ai_* outputs. Repeats until no new nodes are discovered (fixpoint),
 * so deeply nested sub-nodes (e.g., Tool → AgentTool → Agent) are handled.
 */
function expandReachableWithSubNodes(
	reachable: Set<string>,
	connections: SimpleWorkflow['connections'],
	allNodeNames: string[],
): void {
	let changed = true;
	while (changed) {
		changed = false;
		for (const nodeName of allNodeNames) {
			if (reachable.has(nodeName)) continue;

			const nodeConns = connections[nodeName];
			if (!nodeConns) continue;

			const connectsToReachable = Object.entries(nodeConns).some(
				([connType, connGroups]) =>
					connType.startsWith('ai_') &&
					connGroups.some((group) => group?.some((conn) => conn?.node && reachable.has(conn.node))),
			);

			if (connectsToReachable) {
				reachable.add(nodeName);
				changed = true;
			}
		}
	}
}

export const noUnreachableNodes: BinaryCheck = {
	name: 'no_unreachable_nodes',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow, ctx: BinaryCheckContext) {
		// Filter out sticky notes — they are visual annotations, not part of the workflow graph
		const activeNodes = (workflow.nodes ?? []).filter((n) => n.type !== STICKY_NOTE_TYPE);

		if (activeNodes.length === 0) {
			return { pass: true };
		}

		const connections = workflow.connections ?? {};
		const triggers = findTriggerNames(workflow, ctx.nodeTypes);

		// No triggers means all nodes are unreachable — fail explicitly
		if (triggers.length === 0) {
			const nodeNames = activeNodes.map((n) => n.name);
			return {
				pass: false,
				comment: `No trigger found — all nodes unreachable: ${nodeNames.join(', ')}`,
			};
		}

		// Forward BFS from triggers using n8n-workflow's getChildNodes (ALL connection types)
		const reachable = new Set<string>(triggers);
		for (const trigger of triggers) {
			for (const child of getChildNodes(connections, trigger, 'ALL', -1)) {
				reachable.add(child);
			}
		}

		// Iteratively expand: sub-nodes connect TO parents via ai_* outputs.
		// Repeat until stable so nested sub-nodes (Tool → AgentTool → Agent) are found.
		const allNodeNames = activeNodes.map((n) => n.name);
		expandReachableWithSubNodes(reachable, connections, allNodeNames);

		const unreachable = activeNodes.filter((n) => !reachable.has(n.name)).map((n) => n.name);

		return {
			pass: unreachable.length === 0,
			...(unreachable.length > 0
				? { comment: `Unreachable nodes: ${unreachable.join(', ')}` }
				: {}),
		};
	},
};
