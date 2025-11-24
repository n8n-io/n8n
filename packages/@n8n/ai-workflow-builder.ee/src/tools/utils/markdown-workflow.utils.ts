import type { WorkflowMetadata } from '@/types';

/**
 * Find nodes with incoming main connections
 */
function findNodesWithIncomingConnections(
	connections: WorkflowMetadata['workflow']['connections'],
): Set<string> {
	const nodesWithIncoming = new Set<string>();
	for (const [_sourceName, sourceConns] of Object.entries(connections)) {
		for (const [connType, connList] of Object.entries(sourceConns)) {
			if (connType === 'main') {
				for (const connArray of connList) {
					if (connArray) {
						for (const conn of connArray) {
							nodesWithIncoming.add(conn.node);
						}
					}
				}
			}
		}
	}
	return nodesWithIncoming;
}

/**
 * Group AI connections by target node
 */
function groupAIConnectionsByTarget(
	connections: WorkflowMetadata['workflow']['connections'],
): Map<string, string[]> {
	const aiConnectionsByTarget = new Map<string, string[]>();
	for (const [sourceName, sourceConns] of Object.entries(connections)) {
		for (const [connType, connList] of Object.entries(sourceConns)) {
			if (connType !== 'main') {
				for (const connArray of connList) {
					if (connArray) {
						for (const conn of connArray) {
							if (!aiConnectionsByTarget.has(conn.node)) {
								aiConnectionsByTarget.set(conn.node, []);
							}
							aiConnectionsByTarget.get(conn.node)!.push(`    ← [${connType}] ${sourceName}`);
						}
					}
				}
			}
		}
	}
	return aiConnectionsByTarget;
}

/**
 * Build an ASCII flow diagram from nodes and connections
 */
function buildFlowDiagram(
	nodes: WorkflowMetadata['workflow']['nodes'],
	connections: WorkflowMetadata['workflow']['connections'],
): string[] {
	const lines: string[] = [];
	const nodeMap = new Map(nodes.map((n) => [n.name, n]));

	// Find trigger/start nodes (nodes with no incoming main connections)
	const nodesWithIncoming = findNodesWithIncomingConnections(connections);

	const startNodes = nodes.filter(
		(n) => !nodesWithIncoming.has(n.name) && n.type !== 'n8n-nodes-base.stickyNote',
	);

	// Build main flow
	const visited = new Set<string>();
	for (const startNode of startNodes) {
		buildNodeFlow(startNode.name, connections, nodeMap, visited, lines, 0);
	}

	// Add AI connections section
	const aiConnectionsByTarget = groupAIConnectionsByTarget(connections);

	if (aiConnectionsByTarget.size > 0) {
		lines.push('');
		for (const [targetNode, conns] of aiConnectionsByTarget) {
			lines.push(`[AI Connections to ${targetNode}]`);
			lines.push(...conns);
		}
	}

	return lines;
}

/**
 * Recursively build flow for a node
 */
function buildNodeFlow(
	nodeName: string,
	connections: WorkflowMetadata['workflow']['connections'],
	nodeMap: Map<string, WorkflowMetadata['workflow']['nodes'][0]>,
	visited: Set<string>,
	lines: string[],
	depth: number,
): void {
	if (visited.has(nodeName)) {
		return;
	}
	visited.add(nodeName);

	const indent = '    '.repeat(depth);
	lines.push(`${indent}${nodeName}`);

	// Get outgoing main connections
	const nodeConns = connections[nodeName];
	if (!nodeConns?.main) {
		return;
	}

	const mainConns = nodeConns.main;
	for (let i = 0; i < mainConns.length; i++) {
		const connArray = mainConns[i];
		if (!connArray?.length) {
			continue;
		}

		if (connArray.length === 1) {
			// Single connection
			const conn = connArray[0];
			lines.push(`${indent}    ↓ [${conn.type}]`);
			buildNodeFlow(conn.node, connections, nodeMap, visited, lines, depth);
		} else {
			// Multiple connections (branching)
			for (let j = 0; j < connArray.length; j++) {
				const conn = connArray[j];
				const branchSymbol = j === 0 ? '├─' : j === connArray.length - 1 ? '└─' : '├─';
				lines.push(`${indent}    ${branchSymbol} [${conn.type}] → ${conn.node}`);
				// Don't recurse here to avoid complex nesting
			}
		}
	}
}

/**
 * Formats workflow as markdown
 */
export function markdownStringify(workflow: WorkflowMetadata): string {
	const lines: string[] = [];
	const { workflow: wf } = workflow;

	// Add workflow header
	lines.push(`# ${workflow.name}`);
	lines.push('');

	// Add description if present
	if (workflow.description) {
		lines.push(workflow.description);
		lines.push('');
	}

	// Separate sticky notes from regular nodes
	const stickyNotes = wf.nodes.filter((node) => node.type === 'n8n-nodes-base.stickyNote');
	const regularNodes = wf.nodes.filter((node) => node.type !== 'n8n-nodes-base.stickyNote');

	// Add Nodes section
	lines.push('## Nodes');
	lines.push('');
	for (const node of regularNodes) {
		lines.push(`### ${node.name} (${node.type})`);
		if (Object.keys(node.parameters).length > 0) {
			lines.push(`- Parameters: ${JSON.stringify(node.parameters)}`);
		}
		lines.push('');
	}

	// Add Sticky Notes section
	if (stickyNotes.length > 0) {
		lines.push('## Sticky Notes');
		lines.push('');
		for (const note of stickyNotes) {
			const content = note.parameters.content as string | undefined;
			if (content) {
				lines.push(`### ${note.name}`);
				lines.push(content.trim());
				lines.push('');
			}
		}
	}

	// Add Workflow Flow section
	lines.push('## Workflow Flow');
	lines.push('');
	lines.push('```');

	// Build flow diagram from connections
	const connectionLines = buildFlowDiagram(wf.nodes, wf.connections);
	lines.push(...connectionLines);

	lines.push('```');

	return lines.join('\n');
}
