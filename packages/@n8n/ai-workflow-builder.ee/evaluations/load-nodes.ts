import { readFileSync, existsSync } from 'fs';
import { jsonParse, type INodeTypeDescription } from 'n8n-workflow';
import { join } from 'path';

interface NodeWithVersion extends INodeTypeDescription {
	version: number | number[];
	defaultVersion?: number;
}

// These types are ignored because they tend to cause issues when generating workflows
// Same as in ai-workflow-builder-agent.service.ts
const IGNORED_TYPES = new Set([
	'@n8n/n8n-nodes-langchain.toolVectorStore',
	'@n8n/n8n-nodes-langchain.documentGithubLoader',
	'@n8n/n8n-nodes-langchain.code',
]);

// Parse disabled nodes from environment variable (comma-separated)
function getDisabledNodes(): Set<string> {
	const disabledNodesEnv = process.env.N8N_EVALS_DISABLED_NODES ?? '';
	return new Set(
		disabledNodesEnv
			.split(',')
			.map((s) => s.trim())
			.filter(Boolean),
	);
}

/**
 * Filter node types similar to production service:
 * - Remove ignored types (hardcoded)
 * - Remove disabled types (from env var)
 * - Remove hidden nodes (except DataTable)
 * - Merge tool nodes with their non-tool counterparts
 */
function filterNodeTypes(
	nodeTypes: INodeTypeDescription[],
	disabledNodes: Set<string>,
): INodeTypeDescription[] {
	const visibleNodeTypes = nodeTypes.filter(
		(nodeType) =>
			!IGNORED_TYPES.has(nodeType.name) &&
			!disabledNodes.has(nodeType.name) &&
			// Filter out hidden nodes, except for the Data Table node which has custom hiding logic
			(nodeType.hidden !== true || nodeType.name === 'n8n-nodes-base.dataTable'),
	);

	return visibleNodeTypes.map((nodeType) => {
		// If the node type is a tool, merge it with the corresponding non-tool node type
		const isTool = nodeType.name.endsWith('Tool');
		if (!isTool) return nodeType;

		const nonToolNode = nodeTypes.find((nt) => nt.name === nodeType.name.replace('Tool', ''));
		if (!nonToolNode) return nodeType;

		return { ...nonToolNode, ...nodeType };
	});
}

export function loadNodesFromFile(): INodeTypeDescription[] {
	console.log('Loading nodes from nodes.json...');

	const nodesPath = join(__dirname, 'nodes.json');

	// Check if nodes.json exists
	if (!existsSync(nodesPath)) {
		const errorMessage = `
ERROR: nodes.json file not found at ${nodesPath}

The nodes.json file is required for evaluations to work properly.
Please ensure nodes.json is present in the evaluations root directory.

To generate nodes.json:
1. Run the n8n instance
2. Export the node definitions to evaluations/nodes.json
3. This file contains all available n8n node type definitions needed for validation

Without nodes.json, the evaluator cannot validate node types and parameters.
`;
		console.error(errorMessage);
		throw new Error('nodes.json file not found. See console output for details.');
	}

	const nodesData = readFileSync(nodesPath, 'utf-8');
	const allNodes = jsonParse<NodeWithVersion[]>(nodesData);

	console.log(`Total nodes loaded: ${allNodes.length}`);

	// Group nodes by name
	const nodesByName = new Map<string, NodeWithVersion[]>();

	for (const node of allNodes) {
		const existing = nodesByName.get(node.name) ?? [];
		existing.push(node);
		nodesByName.set(node.name, existing);
	}

	console.log(`Unique node types: ${nodesByName.size}`);

	// Extract latest version for each node
	const latestNodes: INodeTypeDescription[] = [];
	let multiVersionCount = 0;

	for (const [_nodeName, versions] of nodesByName.entries()) {
		if (versions.length > 1) {
			multiVersionCount++;
			// Find the node with the default version
			let selectedNode: NodeWithVersion | undefined;

			for (const node of versions) {
				// Select the node that matches the default version
				if (node.defaultVersion !== undefined) {
					if (Array.isArray(node.version)) {
						// For array versions, check if it includes the default version
						if (node.version.includes(node.defaultVersion)) {
							selectedNode = node;
						}
					} else if (node.version === node.defaultVersion) {
						selectedNode = node;
					}
				}
			}

			// If we found a matching node, use it; otherwise use the first one
			if (selectedNode) {
				latestNodes.push(selectedNode);
			} else {
				latestNodes.push(versions[0]);
			}
		} else {
			// Single version node
			latestNodes.push(versions[0]);
		}
	}

	console.log(`\nNodes with multiple versions: ${multiVersionCount}`);
	console.log(`Final node count: ${latestNodes.length}`);

	// Get disabled nodes from environment variable
	const disabledNodes = getDisabledNodes();
	if (disabledNodes.size > 0) {
		console.log(
			`Disabled nodes from N8N_EVALS_DISABLED_NODES env: ${[...disabledNodes].join(', ')}`,
		);
	}

	// Apply full filtering (ignored types, disabled nodes, hidden nodes, tool merging)
	const filteredNodes = filterNodeTypes(latestNodes, disabledNodes);
	console.log(
		`Filtered nodes (after applying ignoredTypes + disabled + hidden): ${filteredNodes.length}\n`,
	);

	return filteredNodes;
}

// Helper function to get specific node version for testing
export function getNodeVersion(nodes: INodeTypeDescription[], nodeName: string): string {
	const node = nodes.find((n) => n.name === nodeName);
	if (!node) return 'not found';

	const version = (node as NodeWithVersion).version;
	if (Array.isArray(version)) {
		return `[${version.join(', ')}]`;
	}
	return version?.toString() || 'unknown';
}
