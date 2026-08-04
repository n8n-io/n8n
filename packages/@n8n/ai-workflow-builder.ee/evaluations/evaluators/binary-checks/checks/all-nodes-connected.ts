import { getChildNodes, mapConnectionsByDestination } from 'n8n-workflow';

import type { BinaryCheck, SimpleWorkflow } from '../types';

const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';

export const allNodesConnected: BinaryCheck = {
	name: 'all_nodes_connected',
	kind: 'deterministic',
	async run(workflow: SimpleWorkflow) {
		// Filter out sticky notes — they are visual annotations, not part of the workflow graph
		const activeNodes = (workflow.nodes ?? []).filter((n) => n.type !== STICKY_NOTE_TYPE);

		if (activeNodes.length === 0) {
			return { pass: true };
		}

		const connections = workflow.connections ?? {};

		// Use n8n-workflow graph utilities to determine connectivity
		const connectionsByDest = mapConnectionsByDestination(connections);

		// Build full reachability set: nodes that appear as source or target in any connection,
		// plus all nodes transitively reachable via getChildNodes (ALL connection types)
		const connected = new Set<string>();
		for (const sourceName of Object.keys(connections)) {
			connected.add(sourceName);
			for (const child of getChildNodes(connections, sourceName, 'ALL', -1)) {
				connected.add(child);
			}
		}
		for (const destName of Object.keys(connectionsByDest)) {
			connected.add(destName);
		}

		const disconnected: string[] = [];
		for (const node of activeNodes) {
			if (!connected.has(node.name)) {
				disconnected.push(node.name);
			}
		}

		return {
			pass: disconnected.length === 0,
			...(disconnected.length > 0
				? { comment: `Disconnected nodes: ${disconnected.join(', ')}` }
				: {}),
		};
	},
};
