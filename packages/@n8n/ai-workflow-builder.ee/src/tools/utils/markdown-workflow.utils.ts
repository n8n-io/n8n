import type { WorkflowMetadata } from '@/types';

/**
 * Options for mermaid diagram generation
 */
export interface MermaidOptions {
	/** Include node type in comments (default: true) */
	includeNodeType?: boolean;
	/** Include node parameters in comments (default: true) */
	includeNodeParameters?: boolean;
	/** Include node name in node definition (default: true) */
	includeNodeName?: boolean;
}

const DEFAULT_MERMAID_OPTIONS: Required<MermaidOptions> = {
	includeNodeType: true,
	includeNodeParameters: true,
	includeNodeName: true,
};

/**
 * Build a Mermaid flowchart from workflow nodes and connections
 */
function buildMermaidLines(
	nodes: WorkflowMetadata['workflow']['nodes'],
	connections: WorkflowMetadata['workflow']['connections'],
	options: Required<MermaidOptions> = DEFAULT_MERMAID_OPTIONS,
): string[] {
	const lines: string[] = ['```mermaid', 'flowchart TD'];
	const regularNodes = nodes.filter((n) => n.type !== 'n8n-nodes-base.stickyNote');

	// Create node ID mapping (n1, n2, n3...)
	const nodeIdMap = new Map<string, string>();
	regularNodes.forEach((node, idx) => {
		nodeIdMap.set(node.name, `n${idx + 1}`);
	});

	const visited = new Set<string>();
	const outputConnections: string[] = [];

	// Find start nodes (no incoming main connections)
	const nodesWithIncoming = new Set<string>();
	for (const sourceConns of Object.values(connections)) {
		if (sourceConns.main) {
			for (const connArray of sourceConns.main) {
				if (connArray) {
					for (const conn of connArray) {
						nodesWithIncoming.add(conn.node);
					}
				}
			}
		}
	}

	const startNodes = regularNodes.filter((n) => !nodesWithIncoming.has(n.name));

	// Traverse from each start node, outputting connections in order
	function traverse(nodeName: string) {
		if (visited.has(nodeName)) return;
		visited.add(nodeName);

		const nodeConns = connections[nodeName];
		if (!nodeConns) return;

		const sourceId = nodeIdMap.get(nodeName);
		if (!sourceId) return;

		// Output all connections from this node
		for (const [connType, connList] of Object.entries(nodeConns)) {
			for (const connArray of connList) {
				if (connArray) {
					for (const conn of connArray) {
						const targetId = nodeIdMap.get(conn.node);
						if (!targetId) continue;

						if (connType === 'main') {
							outputConnections.push(`    ${sourceId} --> ${targetId}`);
						} else {
							// AI connections use dotted lines with labels
							outputConnections.push(`    ${sourceId} -.${connType}.-> ${targetId}`);
						}
					}
				}
			}
		}

		// Recurse to connected nodes (main connections first)
		if (nodeConns.main) {
			for (const connArray of nodeConns.main) {
				if (connArray) {
					for (const conn of connArray) {
						traverse(conn.node);
					}
				}
			}
		}
	}

	for (const startNode of startNodes) {
		traverse(startNode.name);
	}

	// Add node definitions with optional type/params as comments
	for (const node of regularNodes) {
		const id = nodeIdMap.get(node.name);
		if (id) {
			// Build comment line if type or parameters are included
			if (options.includeNodeType || options.includeNodeParameters) {
				const typePart = options.includeNodeType ? node.type : '';
				const hasParams = options.includeNodeParameters && Object.keys(node.parameters).length > 0;
				const paramsPart = hasParams ? ` | ${JSON.stringify(node.parameters)}` : '';

				// Only add comment if there's content
				if (typePart || paramsPart) {
					lines.push(`    %% ${typePart}${paramsPart}`);
				}
			}

			// Build node definition with optional name
			if (options.includeNodeName) {
				lines.push(`    ${id}["${node.name.replace(/"/g, "'")}"]`);
			} else {
				lines.push(`    ${id}`);
			}
		}
	}

	// Add connections
	lines.push(...outputConnections);
	lines.push('```');

	return lines;
}

/**
 * Generates a Mermaid flowchart diagram from a workflow
 */
export function mermaidStringify(workflow: WorkflowMetadata, options?: MermaidOptions): string {
	const { workflow: wf } = workflow;
	const mergedOptions: Required<MermaidOptions> = {
		...DEFAULT_MERMAID_OPTIONS,
		...options,
	};
	return buildMermaidLines(wf.nodes, wf.connections, mergedOptions).join('\n');
}

/**
 * Generates sticky notes section from a workflow
 */
export function stickyNotesStringify(workflow: WorkflowMetadata): string {
	const { workflow: wf } = workflow;
	const stickyNotes = wf.nodes.filter((node) => node.type === 'n8n-nodes-base.stickyNote');

	if (stickyNotes.length === 0) {
		return '';
	}

	const lines: string[] = [];
	for (const note of stickyNotes) {
		const content = note.parameters.content as string | undefined;
		if (content) {
			// Indent continuation lines so they appear as part of the bullet
			const contentLines = content.trim().split('\n');
			const indentedContent = contentLines
				.map((line, idx) => (idx === 0 ? `- ${line}` : `  ${line}`))
				.join('\n');
			lines.push(indentedContent);
		}
	}

	return lines.join('\n');
}
