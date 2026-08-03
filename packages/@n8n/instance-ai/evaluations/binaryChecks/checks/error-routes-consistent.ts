import type { WorkflowNodeResponse } from '../../clients/n8n-client';
import type { BinaryCheck } from '../types';

/** Node types whose extra main outputs are natural, not error pins. */
const MULTI_OUTPUT_TYPES = new Set([
	'n8n-nodes-base.if',
	'n8n-nodes-base.switch',
	'n8n-nodes-base.splitInBatches',
	'n8n-nodes-base.compareDatasets',
	'@n8n/n8n-nodes-langchain.textClassifier',
	'@n8n/n8n-nodes-langchain.sentimentAnalysis',
]);

type MainConnections = Array<Array<{ node: string }> | null | undefined>;

function getMainConnections(value: unknown): MainConnections | undefined {
	if (!value || typeof value !== 'object') return undefined;
	const main = (value as { main?: unknown }).main;
	return Array.isArray(main) ? (main as MainConnections) : undefined;
}

function hasErrorOutput(node: WorkflowNodeResponse): boolean {
	return node.onError === 'continueErrorOutput';
}

export const errorRoutesConsistent: BinaryCheck = {
	name: 'error_routes_consistent',
	description:
		'Error routing is real: nodes with onError: continueErrorOutput have their error output wired, and no connection leaves an output port the node does not have',
	kind: 'deterministic',
	dimension: 'connection_topology',
	run(workflow) {
		const nodes = workflow.nodes ?? [];
		const nodesByName = new Map(nodes.map((node) => [node.name, node]));
		const connections: Record<string, unknown> = workflow.connections ?? {};

		const relevant = nodes.filter(
			(node) => hasErrorOutput(node) || getMainConnections(connections[node.name]),
		);
		if (relevant.length === 0) return { pass: true, applicable: false };

		const issues: string[] = [];

		for (const [sourceName, nodeConnections] of Object.entries(connections)) {
			const main = getMainConnections(nodeConnections);
			if (!main) continue;
			const sourceNode = nodesByName.get(sourceName);
			if (!sourceNode) continue;
			if (MULTI_OUTPUT_TYPES.has(sourceNode.type)) continue;

			const errorPinAllowed = hasErrorOutput(sourceNode);
			for (let index = 1; index < main.length; index++) {
				if (!main[index] || main[index]?.length === 0) continue;
				if (index === 1 && errorPinAllowed) continue;
				issues.push(
					`"${sourceName}" has a connection from output index ${index}, a port it does not have${errorPinAllowed ? '' : " (no onError: 'continueErrorOutput')"}`,
				);
			}
		}

		for (const node of nodes) {
			if (!hasErrorOutput(node) || MULTI_OUTPUT_TYPES.has(node.type)) continue;
			const main = getMainConnections(connections[node.name]);
			const lastSlot = main?.[main.length - 1];
			const errorWired = !!main && main.length >= 2 && !!lastSlot && lastSlot.length > 0;
			if (!errorWired) {
				issues.push(
					`"${node.name}" sets onError: 'continueErrorOutput' but its error output is wired to nothing — failures vanish silently`,
				);
			}
		}

		return {
			pass: issues.length === 0,
			...(issues.length > 0 ? { comment: issues.join('; ') } : {}),
		};
	},
};
