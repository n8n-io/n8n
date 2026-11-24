import type { WorkflowJSON } from '../types/base';

/**
 * Node names and parameter values may contain quotes or newlines, which would
 * terminate the `["label"]` syntax early and malform the flowchart.
 */
function escapeMermaidLabel(text: string): string {
	return text.replace(/"/g, '#quot;').replace(/\s*\r?\n\s*/g, ' ');
}

/**
 * Convert a workflow's nodes and connections to a mermaid flowchart string.
 * Provides the LLM with workflow structure context for consistent data generation.
 */
export function workflowToMermaid(workflow: WorkflowJSON): string {
	const lines: string[] = ['flowchart LR'];

	const nodeIdMap = new Map<string, string>();
	workflow.nodes.forEach((node, i) => {
		if (node.name) nodeIdMap.set(node.name, `n${String(i)}`);
	});

	for (const node of workflow.nodes) {
		if (!node.name) continue;
		const id = nodeIdMap.get(node.name);
		if (!id) continue;

		const params = node.parameters as Record<string, unknown> | undefined;
		const resource = typeof params?.resource === 'string' ? params.resource : undefined;
		const operation = typeof params?.operation === 'string' ? params.operation : undefined;

		const shortType = node.type.split('.').pop() ?? node.type;
		let label = `${node.name} (${shortType} v${String(node.typeVersion)}`;
		if (resource) label += `, resource:${resource}`;
		if (operation) label += `, op:${operation}`;
		label += ')';

		lines.push(`  ${id}["${escapeMermaidLabel(label)}"]`);
	}

	const { connections } = workflow;
	for (const [sourceName, nodeConns] of Object.entries(connections)) {
		const sourceId = nodeIdMap.get(sourceName);
		if (!sourceId) continue;

		for (const [, outputConnections] of Object.entries(nodeConns as Record<string, unknown>)) {
			if (!Array.isArray(outputConnections)) continue;

			for (const outputGroup of outputConnections) {
				if (!Array.isArray(outputGroup)) continue;

				for (const conn of outputGroup) {
					if (typeof conn !== 'object' || conn === null || !('node' in conn)) continue;
					const targetId = nodeIdMap.get((conn as { node: string }).node);
					if (targetId) {
						lines.push(`  ${sourceId} --> ${targetId}`);
					}
				}
			}
		}
	}

	return lines.join('\n');
}
