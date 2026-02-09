import type { INodeUi } from '@/Interface';
import type { IConnections } from 'n8n-workflow';
import type { SecurityFinding } from '../types';

// Node types that send data externally
const EXTERNAL_SERVICE_TYPES = new Set([
	'n8n-nodes-base.httpRequest',
	'n8n-nodes-base.slack',
	'n8n-nodes-base.gmail',
	'n8n-nodes-base.telegram',
	'n8n-nodes-base.discord',
	'n8n-nodes-base.microsoftTeams',
	'n8n-nodes-base.sendGrid',
	'n8n-nodes-base.mailchimp',
	'n8n-nodes-base.hubspot',
	'n8n-nodes-base.salesforce',
	'n8n-nodes-base.airtable',
	'n8n-nodes-base.googleSheets',
	'n8n-nodes-base.notion',
]);

// Node types that receive external input
const INPUT_TRIGGER_TYPES = new Set([
	'n8n-nodes-base.webhook',
	'n8n-nodes-base.formTrigger',
	'n8n-nodes-base.emailReadImap',
]);

/**
 * Builds a set of all node names downstream from the given source nodes,
 * by traversing the connections graph.
 */
function getDownstreamNodes(sourceNames: Set<string>, connections: IConnections): Set<string> {
	const visited = new Set<string>();
	const queue = [...sourceNames];

	while (queue.length > 0) {
		const current = queue.pop()!;
		if (visited.has(current)) continue;
		visited.add(current);

		const nodeConnections = connections[current];
		if (!nodeConnections) continue;

		for (const connectionType of Object.values(nodeConnections)) {
			for (const outputConnections of connectionType) {
				if (!outputConnections) continue;
				for (const connection of outputConnections) {
					if (!visited.has(connection.node)) {
						queue.push(connection.node);
					}
				}
			}
		}
	}

	return visited;
}

/**
 * Detects data exposure risks: webhook data flowing to external services,
 * and Code nodes using console.log.
 */
export function checkDataExposure(nodes: INodeUi[], connections: IConnections): SecurityFinding[] {
	const findings: SecurityFinding[] = [];
	let counter = 0;

	const nodesByName = new Map(nodes.map((n) => [n.name, n]));

	// Find input trigger nodes
	const triggerNames = new Set(
		nodes.filter((n) => INPUT_TRIGGER_TYPES.has(n.type)).map((n) => n.name),
	);

	if (triggerNames.size > 0) {
		// Find which nodes are downstream from triggers
		const downstream = getDownstreamNodes(triggerNames, connections);

		// Check if any external service node receives trigger data
		for (const nodeName of downstream) {
			const node = nodesByName.get(nodeName);
			if (!node) continue;

			if (EXTERNAL_SERVICE_TYPES.has(node.type) && !triggerNames.has(node.name)) {
				const triggerList = [...triggerNames].join(', ');
				findings.push({
					id: `exposure-${++counter}`,
					category: 'data-exposure',
					severity: 'info',
					title: `External input flows to ${node.type.replace('n8n-nodes-base.', '')}`,
					description: `Data from ${triggerList} reaches this node. Ensure sensitive input data is filtered before sending externally.`,
					nodeName: node.name,
					nodeId: node.id,
				});
			}
		}
	}

	// Check Code nodes for console.log
	for (const node of nodes) {
		if (
			(node.type === 'n8n-nodes-base.code' || node.type === 'n8n-nodes-base.codeNode') &&
			node.parameters
		) {
			const code = String((node.parameters as Record<string, unknown>).jsCode ?? '');
			if (code.includes('console.log')) {
				findings.push({
					id: `exposure-${++counter}`,
					category: 'data-exposure',
					severity: 'info',
					title: 'console.log in Code node',
					description:
						'console.log may expose sensitive data in server logs. Remove logging before production use.',
					nodeName: node.name,
					nodeId: node.id,
					parameterPath: 'jsCode',
				});
			}
		}
	}

	return findings;
}
