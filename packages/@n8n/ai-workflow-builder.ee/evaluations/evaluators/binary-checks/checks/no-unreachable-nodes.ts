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

		// Sub-nodes connect TO a parent via ai_* outputs in workflow.connections
		// (they are keyed as source in connections). Check if they connect to a reachable node.
		const unreachable: string[] = [];
		for (const node of activeNodes) {
			if (reachable.has(node.name)) continue;

			const nodeConns = connections[node.name];
			if (nodeConns) {
				const hasAiConnectionToReachable = Object.entries(nodeConns).some(
					([connType, connGroups]) =>
						connType.startsWith('ai_') &&
						connGroups.some((group) =>
							group?.some((conn) => conn?.node && reachable.has(conn.node)),
						),
				);
				if (hasAiConnectionToReachable) continue;
			}

			unreachable.push(node.name);
		}

		return {
			pass: unreachable.length === 0,
			...(unreachable.length > 0
				? { comment: `Unreachable nodes: ${unreachable.join(', ')}` }
				: {}),
		};
	},
};
