import type { WorkflowResponse } from '../../clients/n8n-client';
import type { BinaryCheck } from '../types';
import { collectAllConnectedNodes, getActiveNodes } from '../utils';

export const allNodesConnected: BinaryCheck = {
	name: 'all_nodes_connected',
	description: 'Every non-sticky node is part of the connection graph',
	kind: 'deterministic',
	run(workflow: WorkflowResponse) {
		const activeNodes = getActiveNodes(workflow.nodes ?? []);
		if (activeNodes.length === 0) return { pass: true };

		const connected = collectAllConnectedNodes(workflow.connections ?? {});
		const disconnected = activeNodes.filter((n) => !connected.has(n.name)).map((n) => n.name);

		return {
			pass: disconnected.length === 0,
			...(disconnected.length > 0
				? { comment: `Disconnected nodes: ${disconnected.join(', ')}` }
				: {}),
		};
	},
};
